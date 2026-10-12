begin;
revoke execute on function public.mimo_open_support_image(uuid,text,text,text,text),public.mimo_reply_support_image(uuid,uuid,text,text) from authenticated;
drop policy if exists mimo_support_image_upload on storage.objects;
commit;
-- Preserve registered image reads, private bucket, guard and all ticket/message history.
