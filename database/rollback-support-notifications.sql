-- Stop future support notices without removing history or support functionality.
drop trigger if exists mimo_support_reply_notification on public.support_messages;
drop trigger if exists mimo_support_status_notification on public.support_tickets;
drop function if exists mimo_private.emit_support_notification();
-- Keep the support notification type so existing notification history stays valid.
