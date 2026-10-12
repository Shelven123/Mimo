begin;
drop trigger if exists mimo_enqueue_push on public.notifications;
drop trigger if exists mimo_wake_push on public.notifications;
select cron.unschedule(jobid) from cron.job where jobname='mimo-push-retry';
revoke execute on function public.mimo_register_push(uuid,text,text,text) from authenticated;
delete from mimo_private.push_jobs;
commit;
-- Keep subscription ownership/RLS, Vault keys, notification history and app/media behavior.
