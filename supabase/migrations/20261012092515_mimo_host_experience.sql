-- Greeting writes use existing conversation/message RLS and notification producers.
create function public.mimo_greet_host(request_id uuid,target_host uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); chat_id uuid; previous public.messages;
begin
 if actor is null or request_id is null or actor=target_host or
  not exists(select 1 from public.profiles where id=target_host and role='host') or
  not mimo_private.contact_allowed(target_host,'message') then
  raise exception 'Greeting unavailable' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('mimo-greet:'||least(actor::text,target_host::text)||':'||greatest(actor::text,target_host::text),0));
 select id into chat_id from public.conversations where
  (user_one_id=actor and user_two_id=target_host) or (user_one_id=target_host and user_two_id=actor)
  order by id limit 1;
 if chat_id is null then
  if not mimo_private.contact_allowed(target_host,'start_chat') then raise exception 'Greeting unavailable' using errcode='42501'; end if;
  insert into public.conversations(user_one_id,user_two_id) values(actor,target_host) returning id into chat_id;
 end if;
 insert into public.messages(id,conversation_id,sender_id,content)
  values(request_id,chat_id,actor,'你好，在干嘛呢？') on conflict(id) do nothing;
 if not found then
  select * into previous from public.messages where id=request_id;
  if previous.id is null or previous.sender_id<>actor or previous.conversation_id<>chat_id or previous.message_type<>'text' then
   raise exception 'Greeting ID already used' using errcode='42501'; end if;
 end if;
 return chat_id;
end $$;
revoke all on function public.mimo_greet_host(uuid,uuid) from public,anon;
grant execute on function public.mimo_greet_host(uuid,uuid) to authenticated;

-- Existing generic reports become the Host-report channel; Plaza reports remain separate.
alter table public.reports add column target_snapshot text,
 add column evidence_paths text[] not null default '{}',
 add column review_revision integer not null default 0;
alter table public.reports enable row level security;
revoke all on public.reports from public,anon,authenticated;
grant select on public.reports to authenticated;
grant insert(id,reporter_id,target_user_id,reason,description,evidence_paths) on public.reports to authenticated;
grant update(status,admin_note) on public.reports to authenticated;
create table public.host_report_reviews(
 id uuid primary key default gen_random_uuid(),report_id uuid not null references public.reports(id) on delete cascade,
 admin_id uuid not null references public.profiles(id),previous_status text not null,next_status text not null,
 response text,revision integer not null,created_at timestamptz not null default now(),unique(report_id,revision)
);
alter table public.host_report_reviews enable row level security;
revoke all on public.host_report_reviews from public,anon,authenticated;
grant select on public.host_report_reviews to authenticated;
create policy mimo_host_reviews_read on public.host_report_reviews for select to authenticated using(
 (select public.is_admin((select auth.uid()))) or exists(select 1 from public.reports r where r.id=report_id and r.reporter_id=(select auth.uid()))
);
create index mimo_host_review_admin on public.host_report_reviews(admin_id);
create function mimo_private.guard_host_report() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); host public.profiles; path text;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if tg_op='INSERT' then
  if new.reporter_id<>actor or new.target_user_id=actor or new.target_post_id is not null or new.target_comment_id is not null
   or new.status<>'pending' or new.admin_note is not null or new.review_revision<>0
   or new.reason not in ('spam','harassment','sexual','violence','fraud','privacy','other')
   or new.description is null or char_length(btrim(new.description)) not between 1 and 2000
   or cardinality(new.evidence_paths)>3 then raise exception 'Invalid Host report' using errcode='42501'; end if;
  select * into host from public.profiles where id=new.target_user_id and role='host';
  if not found then raise exception 'Host unavailable' using errcode='42501'; end if;
  foreach path in array new.evidence_paths loop
   if path is null or path not in (actor::text||'/'||new.id::text||'/1.jpg',actor::text||'/'||new.id::text||'/2.jpg',actor::text||'/'||new.id::text||'/3.jpg')
    or not exists(select 1 from storage.objects o where o.bucket_id='plaza-report-evidence' and o.name=path) then
    raise exception 'Invalid evidence' using errcode='42501'; end if;
  end loop;
  if cardinality(new.evidence_paths)<>(select count(distinct x) from unnest(new.evidence_paths) x) then raise exception 'Duplicate evidence' using errcode='42501'; end if;
  new.description:=btrim(new.description);new.target_snapshot:=coalesce(nullif(host.display_name,''),nullif(host.username,''),'Host');
  new.created_at:=now();new.updated_at:=now();
 else
  if not public.is_admin(actor) then raise exception 'Administrator required' using errcode='42501'; end if;
  if (to_jsonb(new)-'status'-'admin_note') is distinct from (to_jsonb(old)-'status'-'admin_note') then
   raise exception 'Report identity and evidence are immutable' using errcode='42501'; end if;
  new.admin_note:=nullif(btrim(new.admin_note),'');
  if row(new.status,new.admin_note) is not distinct from row(old.status,old.admin_note) then return new; end if;
  if old.status not in ('pending','reviewing') or not ((old.status='pending' and new.status in ('reviewing','resolved','rejected')) or
   (old.status='reviewing' and new.status in ('resolved','rejected'))) then raise exception 'Invalid report transition' using errcode='42501'; end if;
  if char_length(coalesce(new.admin_note,''))>2000 or (new.status in ('resolved','rejected') and new.admin_note is null) then
   raise exception 'Provide a public response within 2000 characters' using errcode='42501'; end if;
  new.review_revision:=old.review_revision+1;new.updated_at:=now();
 end if;
 return new;
end $$;
create function mimo_private.audit_host_report() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.review_revision=old.review_revision then return new; end if;
 if auth.uid() is null or not public.is_admin(auth.uid()) then raise exception 'Administrator required' using errcode='42501'; end if;
 insert into public.host_report_reviews(report_id,admin_id,previous_status,next_status,response,revision)
 values(new.id,auth.uid(),old.status,new.status,new.admin_note,new.review_revision);
 return new;
end $$;
revoke all on function mimo_private.guard_host_report(),mimo_private.audit_host_report() from public,anon,authenticated;
create trigger mimo_host_report_guard before insert or update on public.reports for each row execute function mimo_private.guard_host_report();
create trigger mimo_host_report_audit after update on public.reports for each row execute function mimo_private.audit_host_report();
-- Owner cleanup must not delete evidence already bound to a Host report.
create policy mimo_host_evidence_retained on storage.objects as restrictive for delete to authenticated
 using(bucket_id<>'plaza-report-evidence' or not exists(select 1 from public.reports r where name=any(r.evidence_paths)));
create function public.mimo_report_host(request_id uuid,target_host uuid,report_category text,report_reason text,paths text[] default '{}')
 returns uuid language plpgsql security invoker set search_path='' as $$
declare previous public.reports;
begin
 if auth.uid() is null or request_id is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into public.reports(id,reporter_id,target_user_id,reason,description,evidence_paths)
 values(request_id,auth.uid(),target_host,report_category,btrim(report_reason),paths) on conflict(id) do nothing;
 if not found then
  select * into previous from public.reports where id=request_id;
  if previous.id is null or previous.reporter_id<>auth.uid() or previous.target_user_id is distinct from target_host
   or previous.reason is distinct from report_category or previous.description is distinct from btrim(report_reason)
   or previous.evidence_paths is distinct from paths then raise exception 'Report ID already used' using errcode='42501'; end if;
 end if;
 return request_id;
end $$;
create function public.mimo_review_host_report(target_report uuid,expected_revision integer,next_status text,response text default null)
 returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin(auth.uid()) or expected_revision is null or expected_revision<0 or next_status is null then
  raise exception 'Administrator review required' using errcode='42501'; end if;
 update public.reports set status=next_status,admin_note=response where id=target_report and review_revision=expected_revision;
 return found;
end $$;
revoke all on function public.mimo_report_host(uuid,uuid,text,text,text[]),public.mimo_review_host_report(uuid,integer,text,text) from public,anon;
grant execute on function public.mimo_report_host(uuid,uuid,text,text,text[]),public.mimo_review_host_report(uuid,integer,text,text) to authenticated;
