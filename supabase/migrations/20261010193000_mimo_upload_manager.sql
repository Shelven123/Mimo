-- Only Storage API performs object deletion; SQL below changes authorization only.
-- Existing owner/read/upload rules retained. No file or customer record is removed.
create function mimo_private.media_in_use(path text) returns boolean language sql volatile security invoker set search_path='' as $$
 select exists(select 1 from public.posts p where p.author_id=auth.uid() and p.id::text=split_part(path,'/',3) and (mimo_private.media_url(path)=any(p.image_urls) or p.video_url=mimo_private.media_url(path)))
 or exists(select 1 from public.messages m where m.sender_id=auth.uid() and m.id::text=left(split_part(path,'/',4),36) and m.image_url=mimo_private.media_url(path))
$$;
create table public.media_cleanup_claims(
 path text primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 claimed_at timestamptz not null default now()
);
alter table public.media_cleanup_claims enable row level security;
revoke all on public.media_cleanup_claims from public,anon,authenticated;
grant select,insert on public.media_cleanup_claims to authenticated;
create policy media_claim_own_read on public.media_cleanup_claims for select to authenticated using(owner_id=auth.uid());
create policy media_claim_own_insert on public.media_cleanup_claims for insert to authenticated with check(owner_id=auth.uid() and split_part(path,'/',1)=auth.uid()::text);
create function mimo_private.guard_media_cleanup_claim() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or new.owner_id is distinct from auth.uid() or split_part(new.path,'/',1) is distinct from auth.uid()::text then raise exception 'Invalid cleanup owner' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mimo-media/'||new.path,0));
 -- VOLATILE fresh-snapshot query after the reference-registration lock.
 if not exists(select 1 from storage.objects where bucket_id='mimo-media' and name=new.path and created_at<=statement_timestamp()-interval '24 hours') or mimo_private.media_in_use(new.path) then raise exception 'File is recent, missing or in use' using errcode='42501'; end if;
 new.claimed_at:=statement_timestamp();
 return new;
end $$;
revoke all on function mimo_private.guard_media_cleanup_claim() from public,anon,authenticated;
create trigger mimo_cleanup_claim_guard before insert on public.media_cleanup_claims for each row execute function mimo_private.guard_media_cleanup_claim();
revoke all on function mimo_private.media_in_use(text) from public,anon;
grant execute on function mimo_private.media_in_use(text) to authenticated;
-- A permanent claim survives Storage's rolled-back permission probes. Never
-- release it after ambiguous deletion: that would allow publication races.
drop policy mimo_media_cleanup on storage.objects;
create policy mimo_media_cleanup on storage.objects for delete to authenticated using(bucket_id='mimo-media' and split_part(name,'/',1)=auth.uid()::text and exists(select 1 from public.media_cleanup_claims c where c.path=name and c.owner_id=auth.uid()));
create policy mimo_media_no_reuse on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'mimo-media' or not exists(select 1 from public.media_cleanup_claims c where c.path=name));
create function public.mimo_claim_unused_upload(media_path text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or split_part(media_path,'/',1) is distinct from auth.uid()::text then raise exception 'Invalid cleanup owner' using errcode='42501'; end if;
 if exists(select 1 from public.media_cleanup_claims c where c.path=media_path and c.owner_id=auth.uid()) then return true; end if;
 insert into public.media_cleanup_claims(path,owner_id) values(media_path,auth.uid()) on conflict(path) do nothing;
 return true;
end $$;
revoke all on function public.mimo_claim_unused_upload(text) from public,anon;
grant execute on function public.mimo_claim_unused_upload(text) to authenticated;
create or replace function mimo_private.guard_media_reference() returns trigger language plpgsql security invoker set search_path='' as $$
declare urls text[]; url text; object_path text; prefix constant text:='https://zhhgiwqehwuwzxnqbnth.supabase.co/storage/v1/object/authenticated/mimo-media/'; kind text; cap bigint;
begin
 if current_user<>'authenticated' then return new; end if;
 if tg_table_name='posts' then urls:=coalesce(new.image_urls,'{}')||array[new.video_url];
 else
  if tg_op='UPDATE' and (old.image_url like prefix||'%' or new.image_url like prefix||'%') and row(new.id,new.image_url,new.message_type) is distinct from row(old.id,old.image_url,old.message_type) then raise exception 'Uploaded message identity is immutable' using errcode='42501'; end if;
  urls:=array[new.image_url];
 end if;
 -- Serialize reference registration with owner cleanup, in deterministic order.
 for object_path in select distinct substr(u,length(prefix)+1) from unnest(urls) u where u like prefix||'%' order by 1 loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mimo-media/'||object_path,0));
  if exists(select 1 from public.media_cleanup_claims c where c.path=object_path) then raise exception 'File discarded; select and upload it again' using errcode='42501'; end if;
 end loop;
 foreach url in array urls loop
  if url is null then continue; end if;
  -- Reject tokenized/public/alternate-project references to this private bucket.
  if url like '%/mimo-media/%' then
   if url not like prefix||'%' then raise exception 'Invalid private media reference' using errcode='42501'; end if;
   object_path:=substr(url,length(prefix)+1);
   if tg_table_name='posts' then
    if object_path !~ ('^'||auth.uid()::text||'/posts/'||new.id::text||'/([1-6]\.jpg|reel\.(mp4|mov|webm))$') or new.author_id<>auth.uid() then raise exception 'Media must belong to this post' using errcode='42501'; end if;
    kind:=case when url=new.video_url then 'video' else 'image' end;
   else
    if new.message_type<>'image' or object_path<>auth.uid()::text||'/chats/'||new.conversation_id::text||'/'||new.id::text||'.jpg' or new.sender_id<>auth.uid() then raise exception 'Media must belong to this message' using errcode='42501'; end if;
    kind:='image';
   end if;
   cap:=case when kind='image' then 3145728 else 31457280 end;
   if not exists(select 1 from storage.objects o where o.bucket_id='mimo-media' and o.name=object_path and (o.metadata->>'size')::bigint between 1 and cap and ((kind='image' and o.metadata->>'mimetype'='image/jpeg' and object_path like '%.jpg') or (kind='video' and ((o.metadata->>'mimetype'='video/mp4' and object_path like '%.mp4') or (o.metadata->>'mimetype'='video/webm' and object_path like '%.webm') or (o.metadata->>'mimetype'='video/quicktime' and object_path like '%.mov'))))) then raise exception 'Upload missing or invalid' using errcode='42501'; end if;
  end if;
 end loop;
 return new;
end $$;

create function public.mimo_my_uploads(after_path text default null) returns table(path text,bytes text,mime text,uploaded_at timestamptz,in_use boolean,can_remove boolean) language sql volatile security invoker set search_path='' as $$
 select o.name,case when o.metadata->>'size' ~ '^[0-9]+$' then o.metadata->>'size' else null end,o.metadata->>'mimetype',o.created_at,
 mimo_private.media_in_use(o.name),o.created_at<=statement_timestamp()-interval '24 hours' and not mimo_private.media_in_use(o.name)
 from storage.objects o where auth.uid() is not null and o.bucket_id='mimo-media' and split_part(o.name,'/',1)=auth.uid()::text and (after_path is null or o.name>after_path)
 order by o.name limit 31
$$;
revoke all on function public.mimo_my_uploads(text) from public,anon;
grant execute on function public.mimo_my_uploads(text) to authenticated;
