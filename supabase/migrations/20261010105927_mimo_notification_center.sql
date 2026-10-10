-- New notifications only; no replay of private historical events.
create or replace function mimo_private.emit_contact_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; actor uuid; kind text; heading text; body text; target uuid; enabled boolean;
begin
  if tg_table_name='messages' then
    select case when c.user_one_id=new.sender_id then c.user_two_id else c.user_one_id end
      into recipient from public.conversations c where c.id=new.conversation_id
      and new.sender_id in(c.user_one_id,c.user_two_id);
    actor:=new.sender_id;kind:='message';heading:='New message';
    body:=case when new.message_type='text' then left(new.content,120) else 'New attachment' end;target:=new.conversation_id;
    select s.private_messages into enabled from public.notification_settings s where s.user_id=recipient;
  elsif tg_table_name='calls' then
    if new.status<>'ringing' then return new; end if;
    recipient:=new.callee_id;actor:=new.caller_id;kind:='call';heading:='Incoming '||new.call_type||' call';
    body:='Open the caller profile. The call may have ended.';target:=new.id;
    select s.calls into enabled from public.notification_settings s where s.user_id=recipient;
  elsif tg_table_name='follows' then
    recipient:=new.following_id;actor:=new.follower_id;kind:='follow';heading:='New follower';body:='Someone followed you.';
    select s.new_followers into enabled from public.notification_settings s where s.user_id=recipient;
  else return new;
  end if;
  if recipient is null or recipient=actor or enabled=false then return new; end if;
  if exists(select 1 from public.blocked_users b where (b.blocker_id=recipient and b.blocked_id=actor) or (b.blocker_id=actor and b.blocked_id=recipient)) then return new; end if;
  insert into public.notifications(user_id,notification_type,title,content,related_user_id,related_id)
    values(recipient,kind,heading,body,actor,target);
  return new;
end $$;
revoke all on function mimo_private.emit_contact_notification() from public,anon,authenticated;
create trigger mimo_notify_message after insert on public.messages for each row execute function mimo_private.emit_contact_notification();
create trigger mimo_notify_call after insert on public.calls for each row execute function mimo_private.emit_contact_notification();
create trigger mimo_notify_follow after insert on public.follows for each row execute function mimo_private.emit_contact_notification();

-- Only read state is mutable through the public client API.
revoke update on public.notifications from authenticated;
grant update(is_read) on public.notifications to authenticated;
revoke truncate,references,trigger on public.notifications from anon,authenticated;
create index if not exists mimo_notifications_owner_time on public.notifications(user_id,created_at desc,id desc);
create index if not exists mimo_notifications_unread on public.notifications(user_id) where not is_read;
