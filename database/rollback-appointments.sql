drop trigger if exists mimo_notify_appointment on public.appointments;
drop trigger if exists mimo_appointment_transition on public.appointments;
drop function if exists mimo_private.emit_appointment_notification();
drop function if exists mimo_private.guard_appointment_transition();
drop policy if exists mimo_appointment_request on public.appointments;
drop index if exists public.mimo_appointment_accepted_slot;
drop index if exists public.mimo_appointment_user_time;
drop index if exists public.mimo_appointment_host_time;
revoke update(status) on public.appointments from authenticated;
grant update on public.appointments to authenticated;
revoke insert(user_id,host_id,appointment_time,note,status) on public.appointments from authenticated;
grant insert on public.appointments to authenticated;
grant truncate,references,trigger on public.appointments to anon,authenticated;
-- Existing appointment and notification history is retained.
