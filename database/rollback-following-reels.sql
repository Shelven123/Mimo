-- Deploy previous frontend before rollback. No content or follow changes.
create or replace function public.mimo_plaza_feed_v3(page_size integer default 20,page_offset integer default 0,feed_mode text default 'all',target_post uuid default null,media_filter text default 'all')
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
