-- Signed-in text Plaza; preserve existing ownership and Host-only insert policies.
revoke all on public.posts,public.post_likes,public.post_comments from anon;
revoke truncate,references,trigger on public.posts,public.post_likes,public.post_comments from authenticated;
revoke update on public.post_likes from authenticated;
grant select,insert,update,delete on public.posts,public.post_comments to authenticated;
grant select,insert,delete on public.post_likes to authenticated;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
create policy mimo_plaza_post_visibility on public.posts as restrictive for select to authenticated using(author_id=auth.uid() or mimo_private.contact_allowed(author_id,'communicate'));
create policy mimo_plaza_like_visibility on public.post_likes as restrictive for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.posts p where p.id=post_id));
create policy mimo_plaza_comment_visibility on public.post_comments as restrictive for select to authenticated using(user_id=auth.uid() or (mimo_private.contact_allowed(user_id,'communicate') and exists(select 1 from public.posts p where p.id=post_id)));
create policy mimo_plaza_like_contact on public.post_likes as restrictive for insert to authenticated with check(exists(select 1 from public.posts p where p.id=post_id and (p.author_id=auth.uid() or mimo_private.contact_allowed(p.author_id,'communicate'))));
create policy mimo_plaza_comment_contact on public.post_comments as restrictive for insert to authenticated with check(exists(select 1 from public.posts p where p.id=post_id and (p.author_id=auth.uid() or mimo_private.contact_allowed(p.author_id,'communicate'))));
create policy mimo_plaza_comment_update_contact on public.post_comments as restrictive for update to authenticated using(exists(select 1 from public.posts p where p.id=post_id)) with check(exists(select 1 from public.posts p where p.id=post_id));
create function mimo_private.guard_plaza_write() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then
  if current_user in ('anon','authenticated') then raise exception 'Sign in required' using errcode='42501'; end if;
  return new;
 end if;
 if tg_table_name='posts' then
  if new.author_id<>actor or not exists(select 1 from public.profiles where id=actor and role='host') or new.content is null or char_length(btrim(new.content)) not between 1 and 2000 then raise exception 'Host text post required' using errcode='42501'; end if;
  if tg_op='UPDATE' then
   if row(new.id,new.author_id,new.created_at,new.image_urls) is distinct from row(old.id,old.author_id,old.created_at,old.image_urls) then raise exception 'Post identity and media are immutable' using errcode='42501'; end if;
  elsif coalesce(cardinality(new.image_urls),0)>0 then raise exception 'Media publishing is not enabled' using errcode='42501'; end if;
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
revoke all on function mimo_private.guard_plaza_write() from public,anon,authenticated;
create trigger mimo_plaza_post_guard before insert or update on public.posts for each row execute function mimo_private.guard_plaza_write();
create trigger mimo_plaza_comment_guard before insert or update on public.post_comments for each row execute function mimo_private.guard_plaza_write();
create trigger mimo_plaza_like_guard before insert on public.post_likes for each row execute function mimo_private.guard_plaza_write();
create index mimo_plaza_comments_page on public.post_comments(post_id,created_at desc,id desc);
create index mimo_plaza_posts_page on public.posts(created_at desc,id desc);

create function public.mimo_plaza_role() returns text language sql stable security invoker set search_path='' as $$select role from public.profiles where id=auth.uid()$$;
create function public.mimo_plaza_feed(page_size integer default 20,page_offset integer default 0) returns table(id uuid,author_id uuid,author_name text,content text,image_urls text[],created_at timestamptz,likes text,comments text,liked boolean) language sql stable security invoker set search_path='' as $$
 select p.id,p.author_id,coalesce(nullif(pr.display_name,''),nullif(pr.username,''),'Host'),p.content,p.image_urls,p.created_at,
 (select count(*)::text from public.post_likes l where l.post_id=p.id),
 (select count(*)::text from public.post_comments c where c.post_id=p.id),
 exists(select 1 from public.post_likes l where l.post_id=p.id and l.user_id=auth.uid())
 from public.posts p left join public.profiles pr on pr.id=p.author_id
 where auth.uid() is not null order by p.created_at desc,p.id desc
 limit greatest(1,least(coalesce(page_size,20),50)) offset greatest(0,coalesce(page_offset,0))
$$;
create function public.mimo_plaza_comments(target_post uuid,page_size integer default 30,page_offset integer default 0) returns table(id uuid,user_id uuid,author_name text,content text,created_at timestamptz) language sql stable security invoker set search_path='' as $$
 select c.id,c.user_id,coalesce(nullif(pr.display_name,''),nullif(pr.username,''),'Member'),c.content,c.created_at
 from public.post_comments c left join public.profiles pr on pr.id=c.user_id
 where c.post_id=target_post and auth.uid() is not null and exists(select 1 from public.posts p where p.id=target_post)
 order by c.created_at desc,c.id desc limit greatest(1,least(coalesce(page_size,30),100)) offset greatest(0,coalesce(page_offset,0))
$$;
create function public.mimo_publish_post(request_id uuid,body text) returns uuid language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); existing public.posts;
begin
 if actor is null or request_id is null then raise exception 'Sign in and request ID required' using errcode='42501'; end if;
 insert into public.posts(id,author_id,content) values(request_id,actor,body) on conflict(id) do nothing;
 if not found then
  select * into existing from public.posts where id=request_id;
  if existing.id is null or existing.author_id<>actor or existing.content is distinct from btrim(body) then raise exception 'Request ID already used' using errcode='42501'; end if;
 end if;
 return request_id;
end $$;
create function public.mimo_comment_post(request_id uuid,target_post uuid,body text) returns uuid language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); existing public.post_comments;
begin
 if actor is null or request_id is null then raise exception 'Sign in and request ID required' using errcode='42501'; end if;
 insert into public.post_comments(id,post_id,user_id,content) values(request_id,target_post,actor,body) on conflict(id) do nothing;
 if not found then
  select * into existing from public.post_comments where id=request_id;
  if existing.id is null or existing.user_id<>actor or existing.post_id<>target_post or existing.content is distinct from btrim(body) then raise exception 'Request ID already used' using errcode='42501'; end if;
 end if;
 return request_id;
end $$;
create function public.mimo_plaza_like(target_post uuid,liked boolean) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or liked is null then raise exception 'Sign in and desired state required' using errcode='42501'; end if;
 if liked then insert into public.post_likes(post_id,user_id) values(target_post,auth.uid()) on conflict(post_id,user_id) do nothing;
 else delete from public.post_likes where post_id=target_post and user_id=auth.uid(); end if;
 return liked;
end $$;
revoke all on function public.mimo_plaza_role(),public.mimo_plaza_feed(integer,integer),public.mimo_plaza_comments(uuid,integer,integer),public.mimo_publish_post(uuid,text),public.mimo_comment_post(uuid,uuid,text),public.mimo_plaza_like(uuid,boolean) from public,anon;
grant execute on function public.mimo_plaza_role(),public.mimo_plaza_feed(integer,integer),public.mimo_plaza_comments(uuid,integer,integer),public.mimo_publish_post(uuid,text),public.mimo_comment_post(uuid,uuid,text),public.mimo_plaza_like(uuid,boolean) to authenticated;
