-- Disable only new parent-commenter notices; preserve comments and notification history.
begin;
drop trigger if exists mimo_comment_reply_notification on public.post_comments;
drop function if exists mimo_private.emit_comment_reply_notification();
commit;
