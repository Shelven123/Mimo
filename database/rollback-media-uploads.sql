-- Stop new writes without deleting uploaded files, messages or posts.
revoke execute on function public.mimo_send_image(uuid,uuid,text) from authenticated;
drop policy if exists mimo_media_upload on storage.objects;
-- Preserve private read and reference guards for already registered media.
-- Revert frontend separately. Never DELETE storage.objects metadata as cleanup.
