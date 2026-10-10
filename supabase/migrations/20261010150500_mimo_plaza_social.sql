create table public.post_bookmarks(post_id uuid references public.posts(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
create table public.post_reposts(post_id uuid references public.posts(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
alter table public.post_bookmarks enable row level security;
alter table public.post_reposts enable row level security;
revoke all on public.post_bookmarks,public.post_reposts from public,anon,authenticated;
grant select,delete on public.post_bookmarks,public.post_reposts to authenticated;
grant insert(post_id,user_id) on public.post_bookmarks,public.post_reposts to authenticated;
create policy mimo_bookmarks_read on public.post_bookmarks for select to authenticated using(user_id=auth.uid());
create policy mimo_reposts_read on public.post_reposts for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.posts p where p.id=post_id));
create policy mimo_bookmarks_insert on public.post_bookmarks for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id));
create policy mimo_reposts_insert on public.post_reposts for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id));
create policy mimo_bookmarks_delete on public.post_bookmarks for delete to authenticated using(user_id=auth.uid());
create policy mimo_reposts_delete on public.post_reposts for delete to authenticated using(user_id=auth.uid());
create index mimo_bookmarks_owner on public.post_bookmarks(user_id,created_at desc);
create index mimo_reposts_owner on public.post_reposts(user_id,created_at desc);

create table public.plaza_reports(
 id uuid primary key,reporter_id uuid not null references public.profiles(id) on delete cascade,
 post_id uuid references public.posts(id) on delete set null,original_post_id uuid not null,author_id uuid not null,
 post_snapshot text,category text not null check(category in ('spam','harassment','sexual','violence','fraud','privacy','other')),
 reason text not null check(char_length(btrim(reason)) between 1 and 2000),
 evidence_paths text[] not null default '{}',status text not null default 'pending' check(status in ('pending','reviewing','resolved','rejected')),created_at timestamptz not null default now()
);
alter table public.plaza_reports enable row level security;
revoke all on public.plaza_reports from public,anon,authenticated;
grant select on public.plaza_reports to authenticated;
grant insert(id,reporter_id,post_id,original_post_id,author_id,post_snapshot,category,reason,evidence_paths) on public.plaza_reports to authenticated;
create policy mimo_plaza_reports_read on public.plaza_reports for select to authenticated using(reporter_id=auth.uid() or public.is_admin(auth.uid()));
create policy mimo_plaza_reports_insert on public.plaza_reports for insert to authenticated with check(reporter_id=auth.uid() and status='pending' and exists(select 1 from public.posts p where p.id=post_id and p.author_id=author_id and p.author_id<>auth.uid() and p.content is not distinct from post_snapshot));
create index mimo_plaza_reports_owner on public.plaza_reports(reporter_id,created_at desc);
create index mimo_plaza_reports_status on public.plaza_reports(status,created_at);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('plaza-report-evidence','plaza-report-evidence',false,3145728,array['image/jpeg','image/png','image/webp']);
create policy mimo_report_upload on storage.objects for insert to authenticated with check(bucket_id='plaza-report-evidence' and (storage.foldername(name))[1]=auth.uid()::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[123]\.jpg$');
create policy mimo_report_read on storage.objects for select to authenticated using(bucket_id='plaza-report-evidence' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin(auth.uid())));
create policy mimo_report_cleanup on storage.objects for delete to authenticated using(bucket_id='plaza-report-evidence' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.plaza_reports r where name=any(r.evidence_paths)));
create function mimo_private.guard_plaza_report() returns trigger language plpgsql security invoker set search_path='' as $$
declare path text;
begin
 if auth.uid() is null or new.reporter_id<>auth.uid() or new.original_post_id is distinct from new.post_id or cardinality(new.evidence_paths)>3 then raise exception 'Invalid report' using errcode='42501'; end if;
 foreach path in array new.evidence_paths loop
  if path is null or path not in (auth.uid()::text||'/'||new.id::text||'/1.jpg',auth.uid()::text||'/'||new.id::text||'/2.jpg',auth.uid()::text||'/'||new.id::text||'/3.jpg') or not exists(select 1 from storage.objects o where o.bucket_id='plaza-report-evidence' and o.name=path) then raise exception 'Invalid evidence' using errcode='42501'; end if;
 end loop;
 if cardinality(new.evidence_paths)<>(select count(distinct x) from unnest(new.evidence_paths) x) then raise exception 'Duplicate evidence' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function mimo_private.guard_plaza_report() from public,anon,authenticated;
create trigger mimo_plaza_report_guard before insert on public.plaza_reports for each row execute function mimo_private.guard_plaza_report();
create function public.mimo_report_post(request_id uuid,target_post uuid,report_category text,report_reason text,paths text[] default '{}') returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.posts; previous public.plaza_reports;
begin
 if auth.uid() is null or request_id is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into previous from public.plaza_reports where id=request_id;
 if found then
  if previous.reporter_id<>auth.uid() or previous.category is distinct from report_category or previous.reason is distinct from btrim(report_reason) or previous.evidence_paths is distinct from paths or previous.original_post_id<>target_post then raise exception 'Report ID already used' using errcode='42501'; end if;
  return request_id;
 end if;
 select * into p from public.posts where id=target_post;
 if not found then raise exception 'Post unavailable' using errcode='42501'; end if;
 insert into public.plaza_reports(id,reporter_id,post_id,original_post_id,author_id,post_snapshot,category,reason,evidence_paths) values(request_id,auth.uid(),p.id,p.id,p.author_id,p.content,report_category,btrim(report_reason),paths);
 return request_id;
end $$;
create function public.mimo_plaza_mark(target_post uuid,kind text,enabled boolean) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or enabled is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if kind='bookmark' then
  if enabled then insert into public.post_bookmarks(post_id,user_id) values(target_post,auth.uid()) on conflict do nothing;
  else delete from public.post_bookmarks where post_id=target_post and user_id=auth.uid(); end if;
 elsif kind='repost' then
  if enabled then insert into public.post_reposts(post_id,user_id) values(target_post,auth.uid()) on conflict do nothing;
  else delete from public.post_reposts where post_id=target_post and user_id=auth.uid(); end if;
 else raise exception 'Unknown action' using errcode='42501'; end if;
 return enabled;
end $$;
create function public.mimo_plaza_feed_v2(page_size integer default 20,page_offset integer default 0,feed_mode text default 'all',target_post uuid default null)
returns table(id uuid,author_id uuid,author_name text,avatar_url text,age integer,region text,online_status text,last_seen_at timestamptz,content text,image_urls text[],created_at timestamptz,likes text,comments text,liked boolean,reposts text,reposted boolean,saved boolean)
language sql stable security invoker set search_path='' as $$
 select p.id,p.author_id,coalesce(nullif(pr.display_name,''),nullif(pr.username,''),'Host'),pr.avatar_url,
 case when pr.birthday<=current_date and extract(year from age(current_date,pr.birthday)) between 0 and 120 then extract(year from age(current_date,pr.birthday))::integer end,
 pr.region,pr.online_status,pr.last_seen_at,p.content,p.image_urls,p.created_at,
 (select count(*)::text from public.post_likes l where l.post_id=p.id),(select count(*)::text from public.post_comments c where c.post_id=p.id),exists(select 1 from public.post_likes l where l.post_id=p.id and l.user_id=auth.uid()),
 (select count(*)::text from public.post_reposts r where r.post_id=p.id),exists(select 1 from public.post_reposts r where r.post_id=p.id and r.user_id=auth.uid()),exists(select 1 from public.post_bookmarks b where b.post_id=p.id and b.user_id=auth.uid())
 from public.posts p left join public.profiles pr on pr.id=p.author_id where auth.uid() is not null and (target_post is null or p.id=target_post) and
 (feed_mode='all' or (feed_mode='saved' and exists(select 1 from public.post_bookmarks b where b.post_id=p.id and b.user_id=auth.uid())) or (feed_mode='reposted' and exists(select 1 from public.post_reposts r where r.post_id=p.id and r.user_id=auth.uid())))
 order by p.created_at desc,p.id desc limit greatest(1,least(coalesce(page_size,20),50)) offset greatest(0,coalesce(page_offset,0))
$$;
create function public.mimo_plaza_gifts() returns table(id uuid,name text,image_url text,diamond_price text) language sql stable security invoker set search_path='' as $$select id,name,image_url,diamond_price::text from public.gifts where is_active and auth.uid() is not null order by diamond_price,id$$;
revoke all on function public.mimo_report_post(uuid,uuid,text,text,text[]),public.mimo_plaza_mark(uuid,text,boolean),public.mimo_plaza_feed_v2(integer,integer,text,uuid),public.mimo_plaza_gifts() from public,anon;
grant execute on function public.mimo_report_post(uuid,uuid,text,text,text[]),public.mimo_plaza_mark(uuid,text,boolean),public.mimo_plaza_feed_v2(integer,integer,text,uuid),public.mimo_plaza_gifts() to authenticated;
