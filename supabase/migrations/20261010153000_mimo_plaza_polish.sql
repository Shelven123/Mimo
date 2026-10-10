-- Preserve existing records, Host-only publishing and all contact restrictions.
alter table public.posts add column video_url text;
alter table public.post_comments add column parent_id uuid references public.post_comments(id) on delete cascade;
create index mimo_comment_parent on public.post_comments(parent_id) where parent_id is not null;
create index mimo_comment_threads on public.post_comments(post_id,parent_id,created_at desc,id desc);
create or replace function mimo_private.guard_plaza_write() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then
  if current_user in ('anon','authenticated') then raise exception 'Sign in required' using errcode='42501'; end if;
  return new;
 end if;
 if tg_table_name='posts' then
  if new.author_id<>actor or not exists(select 1 from public.profiles where id=actor and role='host') or new.content is null or char_length(btrim(new.content)) not between 1 and 2000 then raise exception 'Host text post required' using errcode='42501'; end if;
  if tg_op='UPDATE' then
   if row(new.id,new.author_id,new.created_at,new.image_urls,new.video_url) is distinct from row(old.id,old.author_id,old.created_at,old.image_urls,old.video_url) then raise exception 'Post identity and media are immutable' using errcode='42501'; end if;
  end if;
  if coalesce(cardinality(new.image_urls),0)>6 or exists(select 1 from unnest(new.image_urls) u where u is null or length(u)>2048 or u !~ '^https://[^/@[:space:]]+(/[^[:space:]]*)?$') or (new.video_url is not null and (length(new.video_url)>2048 or new.video_url !~ '^https://[^/@[:space:]]+(/[^[:space:]]*)?$')) then raise exception 'Invalid HTTPS media' using errcode='42501'; end if;
  new.content:=btrim(new.content);
 elsif tg_table_name='post_comments' then
  if new.user_id<>actor or char_length(btrim(new.content)) not between 1 and 1000 then raise exception 'Invalid comment' using errcode='42501'; end if;
  if tg_op='UPDATE' and row(new.id,new.post_id,new.user_id,new.created_at) is distinct from row(old.id,old.post_id,old.user_id,old.created_at) then raise exception 'Comment identity is immutable' using errcode='42501'; end if;
  new.content:=btrim(new.content);
 elsif tg_table_name='post_likes' then
  if new.user_id<>actor then raise exception 'Invalid like owner' using errcode='42501'; end if;
 end if;
 if tg_op='INSERT' then new.created_at:=now(); end if;
 if tg_table_name<>'post_likes' then new.updated_at:=now(); end if;
 return new;
end $$;

create function mimo_private.guard_comment_thread() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and new.parent_id is distinct from old.parent_id then raise exception 'Reply parent immutable' using errcode='42501'; end if;
 if new.parent_id is not null and not exists(select 1 from public.post_comments p where p.id=new.parent_id and p.post_id=new.post_id and p.parent_id is null and exists(select 1 from public.posts x where x.id=p.post_id)) then raise exception 'Reply unavailable' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function mimo_private.guard_comment_thread() from public,anon,authenticated;
create trigger mimo_comment_thread_guard before insert or update on public.post_comments for each row execute function mimo_private.guard_comment_thread();
create table public.comment_likes(comment_id uuid references public.post_comments(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(comment_id,user_id));
alter table public.comment_likes enable row level security;
create index mimo_comment_likes_owner on public.comment_likes(user_id,created_at desc);
revoke all on public.comment_likes from public,anon,authenticated;
grant select,delete on public.comment_likes to authenticated;
grant insert(comment_id,user_id) on public.comment_likes to authenticated;
create policy mimo_comment_likes_read on public.comment_likes for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.post_comments c join public.posts p on p.id=c.post_id where c.id=comment_id and (c.parent_id is null or exists(select 1 from public.post_comments root where root.id=c.parent_id))));
create policy mimo_comment_likes_insert on public.comment_likes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.post_comments c join public.posts p on p.id=c.post_id where c.id=comment_id and (c.parent_id is null or exists(select 1 from public.post_comments root where root.id=c.parent_id)) and (c.user_id=auth.uid() or mimo_private.contact_allowed(c.user_id,'communicate'))));
create policy mimo_comment_likes_delete on public.comment_likes for delete to authenticated using(user_id=auth.uid());
create function public.mimo_comment_like(target_comment uuid,liked boolean) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or liked is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if liked then insert into public.comment_likes(comment_id,user_id) values(target_comment,auth.uid()) on conflict do nothing; else delete from public.comment_likes where comment_id=target_comment and user_id=auth.uid(); end if;
 return liked;
end $$;
create function public.mimo_comment_reply(request_id uuid,target_post uuid,body text,reply_to uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare previous public.post_comments;
begin
 if auth.uid() is null or request_id is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into public.post_comments(id,post_id,user_id,content,parent_id) values(request_id,target_post,auth.uid(),body,reply_to) on conflict do nothing;
 if not found then
  select * into previous from public.post_comments where id=request_id;
  if previous.id is null or previous.user_id<>auth.uid() or previous.post_id<>target_post or previous.parent_id is distinct from reply_to or previous.content is distinct from btrim(body) then raise exception 'Request ID already used' using errcode='42501'; end if;
 end if;
 return request_id;
end $$;
create function public.mimo_plaza_comments_v2(target_post uuid,page_size integer default 30,page_offset integer default 0,reply_to uuid default null)
returns table(id uuid,user_id uuid,author_name text,avatar_url text,content text,created_at timestamptz,parent_id uuid,likes text,liked boolean,replies text,author_liked boolean)
language sql stable security invoker set search_path='' as $$
 select c.id,c.user_id,coalesce(nullif(pr.display_name,''),nullif(pr.username,''),'Member'),pr.avatar_url,c.content,c.created_at,c.parent_id,
 (select count(*)::text from public.comment_likes l where l.comment_id=c.id),exists(select 1 from public.comment_likes l where l.comment_id=c.id and l.user_id=auth.uid()),
 (select count(*)::text from public.post_comments x where x.parent_id=c.id),exists(select 1 from public.comment_likes l where l.comment_id=c.id and l.user_id=p.author_id)
 from public.post_comments c join public.posts p on p.id=c.post_id left join public.profiles pr on pr.id=c.user_id
 where auth.uid() is not null and c.post_id=target_post and c.parent_id is not distinct from reply_to and (reply_to is null or exists(select 1 from public.post_comments root where root.id=reply_to and root.parent_id is null))
 order by c.created_at desc,c.id desc limit greatest(1,least(coalesce(page_size,30),100)) offset greatest(0,coalesce(page_offset,0))
$$;
create function public.mimo_publish_media(request_id uuid,body text,photos text[] default '{}',reel text default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare previous public.posts;
begin
 if auth.uid() is null or request_id is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into public.posts(id,author_id,content,image_urls,video_url) values(request_id,auth.uid(),body,photos,reel) on conflict do nothing;
 if not found then
  select * into previous from public.posts where id=request_id;
  if previous.id is null or previous.author_id<>auth.uid() or previous.content is distinct from btrim(body) or previous.image_urls is distinct from photos or previous.video_url is distinct from reel then raise exception 'Request ID already used' using errcode='42501'; end if;
 end if;
 return request_id;
end $$;
create function public.mimo_plaza_feed_v3(page_size integer default 20,page_offset integer default 0,feed_mode text default 'all',target_post uuid default null,media_filter text default 'all')
returns table(id uuid,author_id uuid,author_name text,avatar_url text,age integer,region text,online_status text,last_seen_at timestamptz,content text,image_urls text[],video_url text,created_at timestamptz,likes text,comments text,liked boolean,reposts text,reposted boolean,saved boolean)
language sql stable security invoker set search_path='' as $$
 select p.id,p.author_id,coalesce(nullif(pr.display_name,''),nullif(pr.username,''),'Host'),pr.avatar_url,
 case when pr.birthday<=current_date and extract(year from age(current_date,pr.birthday)) between 0 and 120 then extract(year from age(current_date,pr.birthday))::integer end,
 pr.region,pr.online_status,pr.last_seen_at,p.content,p.image_urls,p.video_url,p.created_at,
 (select count(*)::text from public.post_likes l where l.post_id=p.id),(select count(*)::text from public.post_comments c where c.post_id=p.id and (c.parent_id is null or exists(select 1 from public.post_comments root where root.id=c.parent_id))),exists(select 1 from public.post_likes l where l.post_id=p.id and l.user_id=auth.uid()),
 (select count(*)::text from public.post_reposts r where r.post_id=p.id),exists(select 1 from public.post_reposts r where r.post_id=p.id and r.user_id=auth.uid()),exists(select 1 from public.post_bookmarks b where b.post_id=p.id and b.user_id=auth.uid())
 from public.posts p left join public.profiles pr on pr.id=p.author_id where auth.uid() is not null and (target_post is null or p.id=target_post) and
 (feed_mode='all' or (feed_mode='saved' and exists(select 1 from public.post_bookmarks b where b.post_id=p.id and b.user_id=auth.uid())) or (feed_mode='reposted' and exists(select 1 from public.post_reposts r where r.post_id=p.id and r.user_id=auth.uid())))
 and (media_filter='all' or (media_filter='photos' and p.video_url is null and coalesce(cardinality(p.image_urls),0)>0) or (media_filter='reels' and p.video_url is not null))
 order by p.created_at desc,p.id desc limit greatest(1,least(coalesce(page_size,20),50)) offset greatest(0,coalesce(page_offset,0))
$$;

revoke all on function public.mimo_comment_like(uuid,boolean),public.mimo_comment_reply(uuid,uuid,text,uuid),public.mimo_plaza_comments_v2(uuid,integer,integer,uuid),public.mimo_publish_media(uuid,text,text[],text),public.mimo_plaza_feed_v3(integer,integer,text,uuid,text) from public,anon;
grant execute on function public.mimo_comment_like(uuid,boolean),public.mimo_comment_reply(uuid,uuid,text,uuid),public.mimo_plaza_comments_v2(uuid,integer,integer,uuid),public.mimo_publish_media(uuid,text,text[],text),public.mimo_plaza_feed_v3(integer,integer,text,uuid,text) to authenticated;
-- A share is a text message to an existing conversation only, on explicit Send.
create function public.mimo_share_post(request_id uuid,target_post uuid,target_chat uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare recipient uuid; previous public.messages; body text;
begin
 if auth.uid() is null or request_id is null or not exists(select 1 from public.posts p where p.id=target_post) then raise exception 'Post unavailable' using errcode='42501'; end if;
 select case when c.user_one_id=auth.uid() then c.user_two_id else c.user_one_id end into recipient from public.conversations c where c.id=target_chat and auth.uid() in(c.user_one_id,c.user_two_id);
 if recipient is null or not mimo_private.contact_allowed(recipient,'message') then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 body:='Mimo update'||chr(10)||'https://shelven123.github.io/Mimo/plaza.html?post='||target_post::text;
 insert into public.messages(id,conversation_id,sender_id,message_type,content) values(request_id,target_chat,auth.uid(),'text',body) on conflict(id) do nothing;
 if not found then
  select * into previous from public.messages where id=request_id;
  if previous.id is null or previous.sender_id<>auth.uid() or previous.conversation_id<>target_chat or previous.content is distinct from body or previous.message_type is distinct from 'text' then raise exception 'Share ID already used' using errcode='42501'; end if;
 end if;
 return request_id;
end $$;
revoke all on function public.mimo_share_post(uuid,uuid,uuid) from public,anon;
grant execute on function public.mimo_share_post(uuid,uuid,uuid) to authenticated;
