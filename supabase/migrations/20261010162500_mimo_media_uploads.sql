-- CLI is unavailable in this environment; migration applied through Supabase MCP.
-- Durable references contain no token. Signed URLs are created on read, never persisted.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mimo-media','mimo-media',false,31457280,array['image/jpeg','video/mp4','video/webm','video/quicktime']);
create function mimo_private.media_url(path text) returns text language sql immutable security invoker set search_path='' as $$
 select 'https://zhhgiwqehwuwzxnqbnth.supabase.co/storage/v1/object/authenticated/mimo-media/'||path
$$;
create function mimo_private.media_upload_allowed(path text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare parts text[]:=string_to_array(path,'/'); recipient uuid;
begin
 if auth.uid() is null or parts[1] is distinct from auth.uid()::text then return false; end if;
 if path ~ '^[0-9a-f-]{36}/posts/[0-9a-f-]{36}/([1-6]\.jpg|reel\.(mp4|mov|webm))$' then
  return exists(select 1 from public.profiles where id=auth.uid() and role='host');
 elsif path ~ '^[0-9a-f-]{36}/chats/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' then
  select case when c.user_one_id=auth.uid() then c.user_two_id else c.user_one_id end into recipient from public.conversations c where c.id=parts[3]::uuid and auth.uid() in(c.user_one_id,c.user_two_id);
  return recipient is not null and mimo_private.contact_allowed(recipient,'message');
 end if;
 return false;
exception when invalid_text_representation then return false;
end $$;
create function mimo_private.media_read_allowed(path text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare parts text[]:=string_to_array(path,'/');
begin
 if auth.uid() is null then return false; end if;
 if parts[1]=auth.uid()::text then return true; end if;
 if path ~ '^[0-9a-f-]{36}/posts/[0-9a-f-]{36}/([1-6]\.jpg|reel\.(mp4|mov|webm))$' then
  return exists(select 1 from public.posts p where p.id=parts[3]::uuid and p.author_id::text=parts[1] and (mimo_private.media_url(path)=any(p.image_urls) or p.video_url=mimo_private.media_url(path)));
 elsif path ~ '^[0-9a-f-]{36}/chats/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' then
  return exists(select 1 from public.messages m where m.id=left(parts[4],36)::uuid and m.conversation_id=parts[3]::uuid and m.sender_id::text=parts[1] and m.image_url=mimo_private.media_url(path));
 end if;
 return false;
exception when invalid_text_representation then return false;
end $$;
revoke all on function mimo_private.media_url(text),mimo_private.media_upload_allowed(text),mimo_private.media_read_allowed(text) from public,anon;
grant execute on function mimo_private.media_url(text),mimo_private.media_upload_allowed(text),mimo_private.media_read_allowed(text) to authenticated;
create policy mimo_media_upload on storage.objects for insert to authenticated with check(bucket_id='mimo-media' and mimo_private.media_upload_allowed(name));
create policy mimo_media_read on storage.objects for select to authenticated using(bucket_id='mimo-media' and mimo_private.media_read_allowed(name));
-- No UPDATE/upsert permission. Registered files cannot be removed by clients.
create policy mimo_media_cleanup on storage.objects for delete to authenticated using(bucket_id='mimo-media' and split_part(name,'/',1)=auth.uid()::text and not exists(select 1 from public.posts p where p.id::text=split_part(name,'/',3) and (mimo_private.media_url(name)=any(p.image_urls) or p.video_url=mimo_private.media_url(name))) and not exists(select 1 from public.messages m where m.id::text=left(split_part(name,'/',4),36) and m.image_url=mimo_private.media_url(name)));
create function mimo_private.guard_media_reference() returns trigger language plpgsql security invoker set search_path='' as $$
declare urls text[]; url text; path text; prefix constant text:='https://zhhgiwqehwuwzxnqbnth.supabase.co/storage/v1/object/authenticated/mimo-media/'; kind text; cap bigint;
begin
 if current_user<>'authenticated' then return new; end if;
 if tg_table_name='posts' then urls:=coalesce(new.image_urls,'{}')||array[new.video_url];
 else
  if tg_op='UPDATE' and (old.image_url like prefix||'%' or new.image_url like prefix||'%') and row(new.id,new.image_url,new.message_type) is distinct from row(old.id,old.image_url,old.message_type) then raise exception 'Uploaded message identity is immutable' using errcode='42501'; end if;
  urls:=array[new.image_url];
 end if;
 foreach url in array urls loop
  if url is null then continue; end if;
  -- Reject tokenized/public/alternate-project references to this private bucket.
  if url like '%/mimo-media/%' then
   if url not like prefix||'%' then raise exception 'Invalid private media reference' using errcode='42501'; end if;
   path:=substr(url,length(prefix)+1);
   if tg_table_name='posts' then
    if path !~ ('^'||auth.uid()::text||'/posts/'||new.id::text||'/([1-6]\.jpg|reel\.(mp4|mov|webm))$') or new.author_id<>auth.uid() then raise exception 'Media must belong to this post' using errcode='42501'; end if;
    kind:=case when url=new.video_url then 'video' else 'image' end;
   else
    if new.message_type<>'image' or path<>auth.uid()::text||'/chats/'||new.conversation_id::text||'/'||new.id::text||'.jpg' or new.sender_id<>auth.uid() then raise exception 'Media must belong to this message' using errcode='42501'; end if;
    kind:='image';
   end if;
   cap:=case when kind='image' then 3145728 else 31457280 end;
   if not exists(select 1 from storage.objects o where o.bucket_id='mimo-media' and o.name=path and (o.metadata->>'size')::bigint between 1 and cap and ((kind='image' and o.metadata->>'mimetype'='image/jpeg' and path like '%.jpg') or (kind='video' and ((o.metadata->>'mimetype'='video/mp4' and path like '%.mp4') or (o.metadata->>'mimetype'='video/webm' and path like '%.webm') or (o.metadata->>'mimetype'='video/quicktime' and path like '%.mov'))))) then raise exception 'Upload missing or invalid' using errcode='42501'; end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function mimo_private.guard_media_reference() from public,anon,authenticated;
create trigger mimo_post_media_reference before insert or update on public.posts for each row execute function mimo_private.guard_media_reference();
create trigger mimo_message_media_reference before insert or update on public.messages for each row execute function mimo_private.guard_media_reference();
create function public.mimo_send_image(request_id uuid,target_chat uuid,media_path text) returns setof public.messages language plpgsql security invoker set search_path='' as $$
declare previous public.messages; recipient uuid; url text;
begin
 if auth.uid() is null or request_id is null or media_path is distinct from auth.uid()::text||'/chats/'||target_chat::text||'/'||request_id::text||'.jpg' then raise exception 'Invalid image request' using errcode='42501'; end if;
 select case when c.user_one_id=auth.uid() then c.user_two_id else c.user_one_id end into recipient from public.conversations c where c.id=target_chat and auth.uid() in(c.user_one_id,c.user_two_id);
 if recipient is null or not mimo_private.contact_allowed(recipient,'message') then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 url:=mimo_private.media_url(media_path);
 insert into public.messages(id,conversation_id,sender_id,message_type,content,image_url) values(request_id,target_chat,auth.uid(),'image',null,url) on conflict(id) do nothing;
 if not found then
  select * into previous from public.messages where id=request_id;
  if previous.id is null or previous.sender_id<>auth.uid() or previous.conversation_id<>target_chat or previous.message_type<>'image' or previous.image_url is distinct from url then raise exception 'Image request already used' using errcode='42501'; end if;
 end if;
 return query select * from public.messages where id=request_id;
end $$;
revoke all on function public.mimo_send_image(uuid,uuid,text) from public,anon;
grant execute on function public.mimo_send_image(uuid,uuid,text) to authenticated;
