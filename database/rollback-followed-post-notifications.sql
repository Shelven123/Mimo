begin;
drop trigger if exists mimo_followed_post_notification on public.posts;
drop function if exists mimo_private.emit_followed_post_notification();
commit;
-- Existing post, follow and notification history is preserved.
