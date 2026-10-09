create schema if not exists mimo_private;
revoke all on schema mimo_private from public;
grant usage on schema mimo_private to authenticated, anon;

-- Cross-user preferences are read here without exposing their rows to clients.
-- The actor always comes from Auth, never from a caller-supplied actor ID.
create or replace function mimo_private.contact_allowed(target_user uuid, action text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid(); prefs public.privacy_settings%rowtype;
begin
  if actor is null or target_user is null or actor=target_user then return false; end if;
  if not exists(select 1 from public.profiles where id=target_user) then return false; end if;
  if exists(select 1 from public.blocked_users where
    (blocker_id=actor and blocked_id=target_user) or
    (blocker_id=target_user and blocked_id=actor)) then return false; end if;
  select * into prefs from public.privacy_settings where user_id=target_user;
  if action='communicate' then return true;
  elsif action='follow' then return coalesce(prefs.follow_permission,'everyone')='everyone';
  elsif action='call' then return
    exists(select 1 from public.profiles where id=actor and role='user') and
    exists(select 1 from public.profiles where id=target_user and role='host');
  elsif action='profile_view' then return coalesce(prefs.show_profile_views,true) and
    coalesce((select show_profile_views from public.privacy_settings where user_id=actor),true);
  elsif action in ('start_chat','message') then
    if action='message' and exists(select 1 from public.conversations where
      (user_one_id=actor and user_two_id=target_user) or
      (user_one_id=target_user and user_two_id=actor)) then return true; end if;
    return coalesce(prefs.message_permission,'everyone')='everyone' or
      (prefs.message_permission='following' and exists(select 1 from public.follows
        where follower_id=target_user and following_id=actor));
  end if;
  return false;
end $$;
revoke all on function mimo_private.contact_allowed(uuid,text) from public, anon;
grant execute on function mimo_private.contact_allowed(uuid,text) to authenticated;

create or replace function mimo_private.profile_visible(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
select auth.uid() is not null or coalesce((select profile_visibility='everyone'
  from public.privacy_settings where user_id=target_user),true)
$$;
revoke all on function mimo_private.profile_visible(uuid) from public;
grant execute on function mimo_private.profile_visible(uuid) to anon, authenticated;

create or replace function public.mimo_contact_permissions(target_user uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
  'follow',mimo_private.contact_allowed(target_user,'follow'),
  'start_chat',mimo_private.contact_allowed(target_user,'start_chat'),
  'message',mimo_private.contact_allowed(target_user,'message'),
  'call',mimo_private.contact_allowed(target_user,'call'))
$$;
revoke all on function public.mimo_contact_permissions(uuid) from public, anon;
grant execute on function public.mimo_contact_permissions(uuid) to authenticated;

create policy mimo_follow_preferences on public.follows as restrictive for insert to authenticated
with check(mimo_private.contact_allowed(following_id,'follow'));
create policy mimo_chat_preferences on public.conversations as restrictive for insert to authenticated
with check(mimo_private.contact_allowed(case when user_one_id=auth.uid() then user_two_id else user_one_id end,'start_chat'));
create policy mimo_message_block on public.messages as restrictive for insert to authenticated
with check(exists(select 1 from public.conversations c where c.id=conversation_id and
  (c.user_one_id=auth.uid() or c.user_two_id=auth.uid()) and
  mimo_private.contact_allowed(case when c.user_one_id=auth.uid() then c.user_two_id else c.user_one_id end,'message')));
create policy mimo_call_block on public.calls as restrictive for insert to authenticated
with check(status='ringing' and mimo_private.contact_allowed(callee_id,'call')); 
create policy mimo_call_accept_block on public.calls as restrictive for update to authenticated
with check(status not in ('ringing','accepted') or mimo_private.contact_allowed(
  case when caller_id=auth.uid() then callee_id else caller_id end,'communicate'));
create policy mimo_profile_visibility on public.profiles as restrictive for select to anon, authenticated
using(mimo_private.profile_visible(id));
create policy mimo_profile_view_consent on public.profile_views as restrictive for insert to authenticated
with check(mimo_private.contact_allowed(viewed_user_id,'profile_view'));

-- Keep user-editable profile and message fields; protect authorization identities.
create function mimo_private.guard_identity_fields() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if tg_table_name='profiles' then
    if new.id is distinct from old.id or new.role is distinct from old.role then
      raise exception 'Profile identity and role require server authorization' using errcode='42501';
    end if;
  elsif tg_table_name='messages' then
    if new.sender_id is distinct from old.sender_id or new.conversation_id is distinct from old.conversation_id then
      raise exception 'Message participants cannot be changed' using errcode='42501';
    end if;
  elsif tg_table_name='calls' then
    if new.caller_id is distinct from old.caller_id or new.callee_id is distinct from old.callee_id or new.call_type is distinct from old.call_type then
      raise exception 'Call participants and type cannot be changed' using errcode='42501';
    end if;
    if new.status='accepted' and new.status is distinct from old.status and
       (auth.uid() is distinct from old.callee_id or old.status <> 'ringing') then
      raise exception 'Only the recipient can accept a ringing call' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function mimo_private.guard_identity_fields() from public, anon;
grant execute on function mimo_private.guard_identity_fields() to authenticated;
create trigger mimo_profile_identity before update on public.profiles for each row execute function mimo_private.guard_identity_fields();
create trigger mimo_message_identity before update on public.messages for each row execute function mimo_private.guard_identity_fields();
create trigger mimo_call_identity before update on public.calls for each row execute function mimo_private.guard_identity_fields();
