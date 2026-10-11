-- Only trusted support events may write recipient notifications.
alter table public.notifications drop constraint notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check check(notification_type in ('message','like','comment','follow','appointment','call','gift','system','official','activity','interest','support'));
create function mimo_private.emit_support_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); recipient uuid; ticket_id uuid; heading text; enabled boolean;
begin
 if actor is null or not public.is_admin(actor) then return new; end if;
 if tg_table_name='support_messages' then
  if new.sender_id<>actor then return new; end if;
  ticket_id:=new.ticket_id;
  select user_id into recipient from public.support_tickets where id=ticket_id;
  heading:='Support replied to your request';
 else
  if new.status is not distinct from old.status then return new; end if;
  ticket_id:=new.id;recipient:=new.user_id;
  heading:=case new.status when 'in_progress' then 'Your support request is being reviewed' when 'resolved' then 'Your support request was resolved' when 'closed' then 'Your support request was closed' else null end;
 end if;
 if recipient is null or recipient=actor or heading is null then return new; end if;
 select system_messages into enabled from public.notification_settings where user_id=recipient;
 if coalesce(enabled,true)=false then return new; end if;
 insert into public.notifications(user_id,notification_type,title,content,related_user_id,related_id)
 values(recipient,'support',heading,'Open your request to view the latest update.',actor,ticket_id);
 return new;
end $$;
revoke all on function mimo_private.emit_support_notification() from public,anon,authenticated;
create trigger mimo_support_reply_notification after insert on public.support_messages for each row execute function mimo_private.emit_support_notification();
create trigger mimo_support_status_notification after update of status on public.support_tickets for each row execute function mimo_private.emit_support_notification();
