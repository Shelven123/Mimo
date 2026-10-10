-- Disable new Plaza APIs while retaining all records and authorization protections.
drop function if exists public.mimo_plaza_role();
drop function if exists public.mimo_plaza_feed(integer,integer);
drop function if exists public.mimo_plaza_comments(uuid,integer,integer);
drop function if exists public.mimo_publish_post(uuid,text);
drop function if exists public.mimo_comment_post(uuid,uuid,text);
drop function if exists public.mimo_plaza_like(uuid,boolean);
-- Keep guards/RLS and safe grants; do not delete content or restore TRUNCATE.
