-- Isolate optional delivery failures from core message/post transactions.
create or replace function mimo_private.enqueue_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into mimo_private.push_jobs(notification_id,subscription_id)
 select new.id,s.id from public.push_subscriptions s where s.user_id=new.user_id for key share of s;
 return new;
exception when foreign_key_violation then return new;
end $$;
create or replace function mimo_private.wake_push() returns void language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if not exists(select 1 from mimo_private.push_jobs where available_at<=now() and expires_at>now()) then return; end if;
 select (s.decrypted_secret::jsonb)->>'cronSecret' into token from mimo_private.push_config c join vault.decrypted_secrets s on s.id=c.secret_id where c.singleton;
 if token is null then return; end if;
 perform net.http_post(url:='https://zhhgiwqehwuwzxnqbnth.supabase.co/functions/v1/mimo-push',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=10000);
exception when others then return;
end $$;
