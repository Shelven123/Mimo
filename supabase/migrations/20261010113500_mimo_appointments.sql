-- Lifecycle enforcement for the existing appointments table.
create policy mimo_appointment_request on public.appointments as restrictive for insert to authenticated
with check(user_id=auth.uid() and status='pending' and appointment_time>now()
  and appointment_time<=now()+interval '90 days' and char_length(coalesce(note,''))<=500
  and mimo_private.contact_allowed(host_id,'call'));
revoke update on public.appointments from authenticated;
grant update(status) on public.appointments to authenticated;
revoke insert on public.appointments from authenticated;
grant insert(user_id,host_id,appointment_time,note,status) on public.appointments to authenticated;
revoke truncate,references,trigger on public.appointments from anon,authenticated;

create function mimo_private.guard_appointment_transition() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if current_user<>'authenticated' then return new; end if;
 if new.status=old.status then return new; end if;
 if new.status='cancelled' and old.status in ('pending','accepted') and auth.uid() in(old.user_id,old.host_id) then return new; end if;
 if auth.uid()=old.host_id then
   if old.status='pending' and new.status in ('accepted','rejected') then
     if new.status='accepted' and (old.appointment_time<=now() or not mimo_private.contact_allowed(old.user_id,'communicate')) then
       raise exception 'Expired or blocked appointment' using errcode='42501';
     end if;
     return new;
   end if;
   if old.status='accepted' and new.status='completed' and old.appointment_time<=now() then return new; end if;
 end if;
 raise exception 'Invalid appointment transition' using errcode='42501';
end $$;
revoke all on function mimo_private.guard_appointment_transition() from public,anon;
grant execute on function mimo_private.guard_appointment_transition() to authenticated;
create trigger mimo_appointment_transition before update on public.appointments for each row execute function mimo_private.guard_appointment_transition();
create unique index mimo_appointment_accepted_slot on public.appointments(host_id,appointment_time) where status='accepted';
create index mimo_appointment_user_time on public.appointments(user_id,appointment_time desc,id desc);
create index mimo_appointment_host_time on public.appointments(host_id,appointment_time desc,id desc);

create function mimo_private.emit_appointment_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; actor uuid; enabled boolean;
begin
 if tg_op='UPDATE' and new.status=old.status then return new; end if;
 if tg_op='INSERT' then recipient:=new.host_id;actor:=new.user_id;
 elsif new.status='cancelled' and auth.uid()=new.user_id then recipient:=new.host_id;actor:=new.user_id;
 else recipient:=new.user_id;actor:=new.host_id;
 end if;
 select s.appointments into enabled from public.notification_settings s where s.user_id=recipient;
 if enabled=false then return new; end if;
 if exists(select 1 from public.blocked_users b where (b.blocker_id=recipient and b.blocked_id=actor) or (b.blocker_id=actor and b.blocked_id=recipient)) then return new; end if;
 insert into public.notifications(user_id,notification_type,title,content,related_user_id,related_id)
 values(recipient,'appointment','Appointment '||new.status,'Open your appointments to see the scheduled time and details.',actor,new.id);
 return new;
end $$;
revoke all on function mimo_private.emit_appointment_notification() from public,anon,authenticated;
create trigger mimo_notify_appointment after insert or update on public.appointments for each row execute function mimo_private.emit_appointment_notification();
