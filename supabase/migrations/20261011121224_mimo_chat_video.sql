-- Private chat video references; existing photos, RLS and cleanup locks retained.
alter table public.messages add column video_url text;
alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check check(message_type in ('text','image','video','gift','system'));
alter table public.messages add constraint mimo_message_video_shape check ((message_type='video' and video_url is not null and image_url is null and content is null) or (message_type<>'video' and video_url is null));
grant insert(video_url) on public.messages to authenticated;


create or replace function mimo_private.media_upload_allowed(path text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare parts text[]:=string_to_array(path,'/'); recipient uuid;
begin
 if auth.uid() is null or parts[1] is distinct from auth.uid()::text then return false; end if;
 if path ~ '^[0-9a-f-]{36}/posts/[0-9a-f-]{36}/([1-6]\.jpg|reel\.(mp4|mov|webm))$' then
  return exists(select 1 from public.profiles where id=auth.uid() and role='host');
 elsif path ~ '^[0-9a-f-]{36}/chats/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|mp4|mov|webm)$' then
  select case when c.user_one_id=auth.uid() then c.user_two_id else c.user_one_id end into recipient from public.conversations c where c.id=parts[3]::uuid and auth.uid() in(c.user_one_id,c.user_two_id);
  return recipient is not null and mimo_private.contact_allowed(recipient,'message');
 end if;
 return false;
exception when invalid_text_representation then return false;
end $$;

create or replace function mimo_private.media_read_allowed(path text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare parts text[]:=string_to_array(path,'/');
begin
 if auth.uid() is null then return false; end if;
 if parts[1]=auth.uid()::text then return true; end if;
 if path ~ '^[0-9a-f-]{36}/posts/[0-9a-f-]{36}/([1-6]\.jpg|reel\.(mp4|mov|webm))$' then
  return exists(select 1 from public.posts p where p.id=parts[3]::uuid and p.author_id::text=parts[1] and (mimo_private.media_url(path)=any(p.image_urls) or p.video_url=mimo_private.media_url(path)));
 elsif path ~ '^[0-9a-f-]{36}/chats/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|mp4|mov|webm)$' then
  return exists(select 1 from public.messages m where m.id=left(parts[4],36)::uuid and m.conversation_id=parts[3]::uuid and m.sender_id::text=parts[1] and (m.image_url=mimo_private.media_url(path) or m.video_url=mimo_private.media_url(path)));
 end if;
 return false;
exception when invalid_text_representation then return false;
end $$;

create or replace function mimo_private.media_in_use(path text) returns boolean language sql volatile security invoker set search_path='' as $$
 select exists(select 1 from public.posts p where p.author_id=auth.uid() and p.id::text=split_part(path,'/',3) and (mimo_private.media_url(path)=any(p.image_urls) or p.video_url=mimo_private.media_url(path)))
 or exists(select 1 from public.messages m where m.sender_id=auth.uid() and m.id::text=left(split_part(path,'/',4),36) and (m.image_url=mimo_private.media_url(path) or m.video_url=mimo_private.media_url(path)))
$$;

create or replace function mimo_private.guard_media_reference() returns trigger language plpgsql security invoker set search_path='' as $$
declare urls text[]; url text; object_path text; prefix constant text:='https://zhhgiwqehwuwzxnqbnth.supabase.co/storage/v1/object/authenticated/mimo-media/'; kind text; cap bigint;
begin
 if current_user<>'authenticated' then return new; end if;
 if tg_table_name='posts' then urls:=coalesce(new.image_urls,'{}')||array[new.video_url];
 else
  if tg_op='UPDATE' and (old.image_url like prefix||'%' or new.image_url like prefix||'%' or old.video_url is not null or new.video_url is not null) and row(new.id,new.conversation_id,new.sender_id,new.image_url,new.video_url,new.message_type) is distinct from row(old.id,old.conversation_id,old.sender_id,old.image_url,old.video_url,old.message_type) then raise exception 'Uploaded message identity is immutable' using errcode='42501'; end if;
  if new.message_type='video' and (new.video_url not like prefix||'%' or new.video_url is null) then raise exception 'Video must use private storage' using errcode='42501'; end if;
  urls:=array[new.image_url,new.video_url];
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
    kind:=case when url=new.video_url then 'video' else 'image' end;
    if new.sender_id is distinct from auth.uid() or (kind='image' and (new.message_type<>'image' or object_path<>auth.uid()::text||'/chats/'||new.conversation_id::text||'/'||new.id::text||'.jpg')) or (kind='video' and (new.message_type<>'video' or object_path !~ ('^'||auth.uid()::text||'/chats/'||new.conversation_id::text||'/'||new.id::text||'\.(mp4|mov|webm)$'))) then raise exception 'Media must belong to this message' using errcode='42501'; end if;
   end if;
   cap:=case when kind='image' then 3145728 else 31457280 end;
   if not exists(select 1 from storage.objects o where o.bucket_id='mimo-media' and o.name=object_path and (o.metadata->>'size')::bigint between 1 and cap and ((kind='image' and o.metadata->>'mimetype'='image/jpeg' and object_path like '%.jpg') or (kind='video' and ((o.metadata->>'mimetype'='video/mp4' and object_path like '%.mp4') or (o.metadata->>'mimetype'='video/webm' and object_path like '%.webm') or (o.metadata->>'mimetype'='video/quicktime' and object_path like '%.mov'))))) then raise exception 'Upload missing or invalid' using errcode='42501'; end if;
  end if;
 end loop;
 return new;
end $$;

create function public.mimo_send_video(request_id uuid,target_chat uuid,media_path text) returns setof public.messages language plpgsql security invoker set search_path='' as $$
declare previous public.messages; recipient uuid; url text;
begin
 if auth.uid() is null or request_id is null or target_chat is null or media_path is null or media_path !~ ('^'||auth.uid()::text||'/chats/'||target_chat::text||'/'||request_id::text||'\.(mp4|mov|webm)$') then raise exception 'Invalid video request' using errcode='42501'; end if;
 select case when c.user_one_id=auth.uid() then c.user_two_id else c.user_one_id end into recipient from public.conversations c where c.id=target_chat and auth.uid() in(c.user_one_id,c.user_two_id);
 if recipient is null or not mimo_private.contact_allowed(recipient,'message') then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 url:=mimo_private.media_url(media_path);
 insert into public.messages(id,conversation_id,sender_id,message_type,content,video_url) values(request_id,target_chat,auth.uid(),'video',null,url) on conflict(id) do nothing;
 if not found then
  select * into previous from public.messages where id=request_id;
  if previous.id is null or previous.sender_id<>auth.uid() or previous.conversation_id<>target_chat or previous.message_type<>'video' or previous.video_url is distinct from url then raise exception 'Video request already used' using errcode='42501'; end if;
 end if;
 return query select * from public.messages where id=request_id;
end $$;
revoke all on function public.mimo_send_video(uuid,uuid,text) from public,anon;
grant execute on function public.mimo_send_video(uuid,uuid,text) to authenticated;
