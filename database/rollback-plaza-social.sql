-- Revert frontend, then disable new APIs. Retain report evidence and user records.
drop function if exists public.mimo_plaza_feed_v2(integer,integer,text,uuid);
drop function if exists public.mimo_plaza_mark(uuid,text,boolean);
drop function if exists public.mimo_report_post(uuid,uuid,text,text,text[]);
drop function if exists public.mimo_plaza_gifts();
-- Do not delete private bucket/files, reports, bookmarks or reposts; retain RLS/guards.
