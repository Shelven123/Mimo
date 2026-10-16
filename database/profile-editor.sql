-- Additive profile-editor fields. Existing profile identity, role and visibility rules stay active.
alter table public.profiles add column if not exists gender text check (gender in ('male','female'));
alter table public.profiles add column if not exists favorite_personality text[] not null default '{}';
alter table public.profiles add column if not exists favorite_appearance text[] not null default '{}';
-- New immutable avatar paths are owned by the authenticated uploader. Public avatar reads
-- follow the existing public bucket; no permission to replace/delete another user's files.
create policy mimo_profile_avatar_upload on storage.objects for insert to authenticated
with check (bucket_id='avatars' and (select auth.uid()) is not null
 and split_part(name,'/',1)=(select auth.uid())::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$');
notify pgrst, 'reload schema';
