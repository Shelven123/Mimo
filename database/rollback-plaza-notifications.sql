drop trigger if exists mimo_plaza_like_notification on public.post_likes;
drop trigger if exists mimo_plaza_comment_notification on public.post_comments;
drop function if exists mimo_private.emit_plaza_notification();
-- Notification history and interactions are preserved.
