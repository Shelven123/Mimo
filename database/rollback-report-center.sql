-- Disable review writes; preserve reports, evidence, responses and audit history.
revoke execute on function public.mimo_review_plaza_report(uuid,integer,text,text) from public,anon,authenticated;
revoke update(status,review_response) on public.plaza_reports from authenticated;
-- Keep corrected submission validation, RLS and audit/guard triggers in place.
