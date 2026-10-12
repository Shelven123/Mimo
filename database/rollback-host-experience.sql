-- Stop optional greeting/report/review writes without deleting customer history.
revoke execute on function public.mimo_greet_host(uuid,uuid),public.mimo_report_host(uuid,uuid,text,text,text[]),public.mimo_review_host_report(uuid,integer,text,text) from public,anon,authenticated;
revoke insert(id,reporter_id,target_user_id,reason,description,evidence_paths),update(status,admin_note) on public.reports from authenticated;
-- Keep report/history/evidence RLS and guards, including retained-evidence restriction.
