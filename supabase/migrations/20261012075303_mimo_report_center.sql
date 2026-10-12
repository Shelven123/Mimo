-- Extend existing Plaza reports; do not migrate or erase report/evidence history.
alter table public.plaza_reports add column review_response text,
 add column review_revision integer not null default 0,
 add column reviewed_at timestamptz;
create table public.plaza_report_reviews(
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.plaza_reports(id) on delete cascade,
 admin_id uuid not null references public.profiles(id),
 previous_status text not null,next_status text not null,
 response text,revision integer not null,created_at timestamptz not null default now(),
 unique(report_id,revision)
);
alter table public.plaza_report_reviews enable row level security;
revoke all on public.plaza_report_reviews from public,anon,authenticated;
grant select on public.plaza_report_reviews to authenticated;
create policy mimo_report_reviews_read on public.plaza_report_reviews for select to authenticated
 using((select public.is_admin((select auth.uid()))) or exists(
  select 1 from public.plaza_reports r where r.id=report_id and r.reporter_id=(select auth.uid())
 ));
create index mimo_report_reviews_admin on public.plaza_report_reviews(admin_id);
-- Qualify the outer author column: the historical unqualified name bound to p.author_id.
alter policy mimo_plaza_reports_insert on public.plaza_reports
 with check(reporter_id=(select auth.uid()) and status='pending' and exists(
  select 1 from public.posts p where p.id=plaza_reports.post_id
   and p.author_id=plaza_reports.author_id and p.author_id<>(select auth.uid())
   and p.content is not distinct from plaza_reports.post_snapshot
 ));
grant update(status,review_response) on public.plaza_reports to authenticated;
create policy mimo_report_admin_update on public.plaza_reports for update to authenticated
 using((select public.is_admin((select auth.uid()))))
 with check((select public.is_admin((select auth.uid()))));
create function mimo_private.guard_report_review() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 -- Post deletion uses ON DELETE SET NULL, including when the deleting Host is not an admin.
 if new.post_id is null and old.post_id is not null
  and (to_jsonb(new)-'post_id')=(to_jsonb(old)-'post_id') then return new; end if;
 if auth.uid() is null or not public.is_admin(auth.uid()) then
  raise exception 'Administrator required' using errcode='42501'; end if;
 if (to_jsonb(new)-'status'-'review_response') is distinct from
  (to_jsonb(old)-'status'-'review_response') then
  raise exception 'Report identity and evidence are immutable' using errcode='42501'; end if;
 new.review_response:=nullif(btrim(new.review_response),'');
 if row(new.status,new.review_response) is not distinct from row(old.status,old.review_response) then return new; end if;
 if old.status not in ('pending','reviewing') or not (
  (old.status='pending' and new.status in ('reviewing','resolved','rejected')) or
  (old.status='reviewing' and new.status in ('resolved','rejected'))
 ) then raise exception 'Invalid report transition' using errcode='42501'; end if;
 if char_length(coalesce(new.review_response,''))>2000 or
  (new.status in ('resolved','rejected') and new.review_response is null) then
  raise exception 'Provide a public response within 2000 characters' using errcode='42501'; end if;
 new.review_revision:=old.review_revision+1;new.reviewed_at:=now();return new;
end $$;
-- Private definer is required only to append audit history without granting client writes.
create function mimo_private.audit_report_review() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if new.review_revision=old.review_revision then return new; end if;
 if auth.uid() is null or not public.is_admin(auth.uid()) then
  raise exception 'Administrator required' using errcode='42501'; end if;
 insert into public.plaza_report_reviews(report_id,admin_id,previous_status,next_status,response,revision)
 values(new.id,auth.uid(),old.status,new.status,new.review_response,new.review_revision);
 return new;
end $$;
revoke all on function mimo_private.guard_report_review(),mimo_private.audit_report_review() from public,anon,authenticated;
create trigger mimo_report_review_guard before update on public.plaza_reports
 for each row execute function mimo_private.guard_report_review();
create trigger mimo_report_review_audit after update on public.plaza_reports
 for each row execute function mimo_private.audit_report_review();
create function public.mimo_review_plaza_report(target_report uuid,expected_revision integer,next_status text,response text default null)
 returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin(auth.uid()) then
  raise exception 'Administrator required' using errcode='42501'; end if;
 if expected_revision is null or expected_revision<0 or next_status is null then
  raise exception 'Invalid review' using errcode='42501'; end if;
 update public.plaza_reports set status=next_status,review_response=response
  where id=target_report and review_revision=expected_revision;
 return found;
end $$;
revoke all on function public.mimo_review_plaza_report(uuid,integer,text,text) from public,anon;
grant execute on function public.mimo_review_plaza_report(uuid,integer,text,text) to authenticated;
