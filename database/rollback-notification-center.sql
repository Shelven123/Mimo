drop trigger if exists mimo_notify_message on public.messages;
drop trigger if exists mimo_notify_call on public.calls;
drop trigger if exists mimo_notify_follow on public.follows;
drop function if exists mimo_private.emit_contact_notification();
drop index if exists public.mimo_notifications_owner_time;
drop index if exists public.mimo_notifications_unread;
revoke update(is_read) on public.notifications from authenticated;
grant update on public.notifications to authenticated;
grant truncate,references,trigger on public.notifications to anon,authenticated;
-- Stored notifications and existing own-user RLS are retained.
