-- Stop new cleanup without deleting files, claims, posts or messages.
-- Keep permanent claims and reference guards: releasing discarded paths could
-- resurrect old drafts after an ambiguous Storage response.
drop policy if exists mimo_media_cleanup on storage.objects;
revoke insert on public.media_cleanup_claims from authenticated;
revoke all on function public.mimo_claim_unused_upload(text),public.mimo_my_uploads(text) from authenticated;
-- Revert uploads.html / upload-manager.js / Settings entry separately.
