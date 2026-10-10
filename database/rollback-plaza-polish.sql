-- Disable new entry points, preserve replies/likes/media/messages and inherited RLS.
-- Revert the frontend to its preceding version at the same time.
revoke execute on function public.mimo_comment_like(uuid,boolean),public.mimo_comment_reply(uuid,uuid,text,uuid),public.mimo_plaza_comments_v2(uuid,integer,integer,uuid),public.mimo_publish_media(uuid,text,text[],text),public.mimo_plaza_feed_v3(integer,integer,text,uuid,text),public.mimo_share_post(uuid,uuid,uuid) from authenticated;
