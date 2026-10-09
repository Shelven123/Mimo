-- Use only together with frontend rollback. Existing rows and original policies are preserved.
begin;
drop policy if exists mimo_follow_preferences on public.follows;
drop policy if exists mimo_chat_preferences on public.conversations;
drop policy if exists mimo_message_block on public.messages;
drop policy if exists mimo_call_block on public.calls;
drop policy if exists mimo_call_accept_block on public.calls;
drop policy if exists mimo_profile_visibility on public.profiles;
drop policy if exists mimo_profile_view_consent on public.profile_views;
drop trigger if exists mimo_profile_identity on public.profiles;
drop trigger if exists mimo_message_identity on public.messages;
drop trigger if exists mimo_call_identity on public.calls;
drop function if exists public.mimo_contact_permissions(uuid);
drop function if exists mimo_private.guard_identity_fields();
drop function if exists mimo_private.contact_allowed(uuid,text);
drop function if exists mimo_private.profile_visible(uuid);
commit;
