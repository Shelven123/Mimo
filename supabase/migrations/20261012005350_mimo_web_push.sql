-- Managed migration: CLI telemetry previously rejected; deploy through Supabase MCP.
create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;
revoke usage on schema net,cron from public,anon,authenticated;
create table mimo_private.push_config(singleton boolean primary key default true check(singleton),public_key text not null,secret_id uuid not null);
alter table mimo_private.push_config enable row level security;
revoke all on mimo_private.push_config from public,anon,authenticated;
create table public.push_subscriptions(id uuid primary key,user_id uuid not null references public.profiles(id) on delete cascade,session_id uuid not null references auth.sessions(id) on delete cascade,endpoint text not null unique,p256dh text not null,auth_key text not null,created_at timestamptz not null default now());
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public,anon,authenticated;
grant select,delete on public.push_subscriptions to authenticated;
create index mimo_push_session on public.push_subscriptions(session_id);
create index mimo_push_owner on public.push_subscriptions(user_id);
create policy mimo_push_own_read on public.push_subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy mimo_push_own_remove on public.push_subscriptions for delete to authenticated using(user_id=(select auth.uid()));
create table mimo_private.push_jobs(id bigint generated always as identity primary key,notification_id uuid not null references public.notifications(id) on delete cascade,subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,attempts integer not null default 0,available_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '5 minutes',unique(notification_id,subscription_id));
alter table mimo_private.push_jobs enable row level security;
revoke all on mimo_private.push_jobs from public,anon,authenticated;
create index mimo_push_due on mimo_private.push_jobs(available_at);
create index mimo_push_subscription on mimo_private.push_jobs(subscription_id);
create function mimo_private.register_push(device_id uuid,p_endpoint text,p_key text,p_auth text) returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); active_session uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
begin
 if active_session is null or not exists(select 1 from auth.sessions where id=active_session and user_id=actor and (not_after is null or not_after>now())) then raise exception 'Session unavailable' using errcode='42501';end if;
 if actor is null or device_id is null or length(p_endpoint)>2048 or p_endpoint !~ '^https://(web[.]push[.]apple[.]com|fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com)/[A-Za-z0-9_/?=&.%~:-]+$'
 or p_key !~ '^[A-Za-z0-9_-]{87}$' or p_auth !~ '^[A-Za-z0-9_-]{22}$' or p_endpoint is null or p_key is null or p_auth is null
 then raise exception 'Invalid push subscription' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mimo-push/'||actor::text,0));
 if exists(select 1 from public.push_subscriptions where (id=device_id or endpoint=p_endpoint) and user_id<>actor) then raise exception 'Subscription belongs to another session. Disable and retry.' using errcode='42501'; end if;
 if not exists(select 1 from public.push_subscriptions where id=device_id and user_id=actor) and (select count(*) from public.push_subscriptions where user_id=actor)>=10 then raise exception 'Too many devices' using errcode='42501'; end if;
 -- Same device/key retry leaves queued delivery unchanged.
 if exists(select 1 from public.push_subscriptions where id=device_id and user_id=actor and endpoint=p_endpoint and p256dh=p_key and auth_key=p_auth and session_id=active_session) then return true; end if;
 delete from public.push_subscriptions where user_id=actor and (id=device_id or endpoint=p_endpoint);
 insert into public.push_subscriptions(id,user_id,session_id,endpoint,p256dh,auth_key) values(device_id,actor,active_session,p_endpoint,p_key,p_auth);
 return true;
end $$;
revoke all on function mimo_private.register_push(uuid,text,text,text) from public,anon;
grant execute on function mimo_private.register_push(uuid,text,text,text) to authenticated;
create function public.mimo_register_push(device_id uuid,p_endpoint text,p_key text,p_auth text) returns boolean language sql security invoker set search_path='' as $$select mimo_private.register_push(device_id,p_endpoint,p_key,p_auth)$$;
revoke all on function public.mimo_register_push(uuid,text,text,text) from public,anon;
grant execute on function public.mimo_register_push(uuid,text,text,text) to authenticated;
-- Only trusted Edge service can read/init encryption material. Private key lives in Vault.
create function public.mimo_push_config(p_public text default null,p_secret text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg mimo_private.push_config; secret text;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mimo-push-config',0));
 select * into cfg from mimo_private.push_config where singleton;
 if not found then
  if p_public is null or p_secret is null then return null; end if;
  insert into mimo_private.push_config(public_key,secret_id) values(p_public,vault.create_secret(p_secret,'mimo_web_push_secret')) returning * into cfg;
 end if;
 select decrypted_secret into secret from vault.decrypted_secrets where id=cfg.secret_id;
 return jsonb_build_object('publicKey',cfg.public_key,'secret',secret::jsonb);
end $$;
revoke all on function public.mimo_push_config(text,text) from public,anon,authenticated;
grant execute on function public.mimo_push_config(text,text) to service_role;
create function mimo_private.enqueue_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into mimo_private.push_jobs(notification_id,subscription_id)
 select new.id,s.id from public.push_subscriptions s where s.user_id=new.user_id;
 return new;
end $$;
revoke all on function mimo_private.enqueue_push() from public,anon,authenticated;
create trigger mimo_enqueue_push after insert on public.notifications for each row execute function mimo_private.enqueue_push();
create function mimo_private.wake_push() returns void language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if not exists(select 1 from mimo_private.push_jobs where available_at<=now() and expires_at>now()) then return; end if;
 select (s.decrypted_secret::jsonb)->>'cronSecret' into token from mimo_private.push_config c join vault.decrypted_secrets s on s.id=c.secret_id where c.singleton;
 if token is null then return; end if;
 perform net.http_post(url:='https://zhhgiwqehwuwzxnqbnth.supabase.co/functions/v1/mimo-push',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=10000);
end $$;
revoke all on function mimo_private.wake_push() from public,anon,authenticated;
create function mimo_private.wake_push_insert() returns trigger language plpgsql security definer set search_path='' as $$begin perform mimo_private.wake_push();return null;end $$;
revoke all on function mimo_private.wake_push_insert() from public,anon,authenticated;
create trigger mimo_wake_push after insert on public.notifications for each statement execute function mimo_private.wake_push_insert();
select cron.schedule('mimo-push-retry','* * * * *',$$select mimo_private.wake_push();$$);
create function public.mimo_claim_push() returns table(job_id bigint,endpoint text,p256dh text,auth_key text,notification_type text,related_id uuid,related_user_id uuid) language plpgsql security definer set search_path='' as $$
begin
 delete from mimo_private.push_jobs j where expires_at<=now() or attempts>=8;
 delete from mimo_private.push_jobs j using public.notifications n,public.push_subscriptions s where j.notification_id=n.id and j.subscription_id=s.id and (n.is_read or s.user_id<>n.user_id or not exists(select 1 from auth.sessions a where a.id=s.session_id and a.user_id=s.user_id and (a.not_after is null or a.not_after>now())));
 return query with due as (
 select j.id from mimo_private.push_jobs j join public.notifications n on n.id=j.notification_id join public.push_subscriptions s on s.id=j.subscription_id left join public.notification_settings pref on pref.user_id=n.user_id
 where j.available_at<=now() and j.expires_at>now() and
 (case n.notification_type when 'message' then pref.private_messages when 'call' then pref.calls when 'follow' then pref.new_followers when 'appointment' then pref.appointments when 'official' then pref.official_messages when 'system' then pref.system_messages when 'support' then pref.system_messages when 'like' then pref.activity_posts when 'comment' then pref.activity_posts when 'activity' then pref.activity_posts else false end) is distinct from false
 and not exists(select 1 from public.blocked_users b where (b.blocker_id=n.user_id and b.blocked_id=n.related_user_id) or (b.blocker_id=n.related_user_id and b.blocked_id=n.user_id))
 order by j.id limit 40 for update of j skip locked
 ), leased as (update mimo_private.push_jobs j set attempts=j.attempts+1,available_at=now()+interval '30 seconds' from due where j.id=due.id returning j.*)
 select j.id,s.endpoint,s.p256dh,s.auth_key,n.notification_type,n.related_id,n.related_user_id from leased j join public.push_subscriptions s on s.id=j.subscription_id join public.notifications n on n.id=j.notification_id;
end $$;
create function public.mimo_finish_push(p_job bigint,p_result text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_result='gone' then delete from public.push_subscriptions s using mimo_private.push_jobs j where j.id=p_job and s.id=j.subscription_id;
 elsif p_result='sent' then delete from mimo_private.push_jobs where id=p_job;
 elsif p_result='retry' then update mimo_private.push_jobs set available_at=now()+interval '1 minute' where id=p_job;
 else raise exception 'Invalid result';end if;
end $$;
revoke all on function public.mimo_claim_push(),public.mimo_finish_push(bigint,text) from public,anon,authenticated;
grant execute on function public.mimo_claim_push(),public.mimo_finish_push(bigint,text) to service_role;
