-- Isolated PostgreSQL fixture: relevant columns/policies mirrored from the live audit.
create role authenticated; create role anon;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table profiles(id uuid primary key,role text default 'user');
create table privacy_settings(user_id uuid primary key,message_permission text default 'everyone',follow_permission text default 'everyone',profile_visibility text default 'everyone',show_profile_views boolean default true);
create table blocked_users(blocker_id uuid,blocked_id uuid,primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id));
create table follows(follower_id uuid,following_id uuid,primary key(follower_id,following_id));
create table conversations(id uuid default gen_random_uuid() primary key,user_one_id uuid,user_two_id uuid,check(user_one_id<>user_two_id));
create table messages(id uuid default gen_random_uuid() primary key,conversation_id uuid,sender_id uuid,content text);
create table calls(id uuid default gen_random_uuid() primary key,caller_id uuid,callee_id uuid,status text,call_type text);
create table profile_views(viewer_user_id uuid,viewed_user_id uuid);
grant select,insert,update,delete on all tables in schema public to authenticated,anon;
alter table profiles enable row level security;
alter table privacy_settings enable row level security;
alter table blocked_users enable row level security;
alter table follows enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table calls enable row level security;
alter table profile_views enable row level security;
create policy allow_public_read_profiles on profiles for select to anon,authenticated using(true);
create policy profiles_update_own on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy privacy_settings_own on privacy_settings to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy blocked_users_own on blocked_users to authenticated using(blocker_id=auth.uid()) with check(blocker_id=auth.uid());
create policy follows_select on follows for select to authenticated using(true);
create policy follows_insert on follows for insert to authenticated with check(follower_id=auth.uid());
create policy follows_delete on follows for delete to authenticated using(follower_id=auth.uid());
create policy conversations_select on conversations for select to authenticated using(user_one_id=auth.uid() or user_two_id=auth.uid());
create policy conversations_insert on conversations for insert to authenticated with check(user_one_id=auth.uid() or user_two_id=auth.uid());
create policy messages_select on messages for select to authenticated using(sender_id=auth.uid() or conversation_id in(select id from conversations where user_one_id=auth.uid() or user_two_id=auth.uid()));
create policy messages_insert on messages for insert to authenticated with check(sender_id=auth.uid() and conversation_id in(select id from conversations where user_one_id=auth.uid() or user_two_id=auth.uid()));
create function can_start_host_call(a uuid,b uuid) returns boolean language sql stable security definer as $$
select exists(select 1 from profiles where id=a and role='user') and exists(select 1 from profiles where id=b and role='host') $$;
create policy calls_select on calls for select to authenticated using(caller_id=auth.uid() or callee_id=auth.uid());
create policy calls_insert on calls for insert to authenticated with check(caller_id=auth.uid() and can_start_host_call(caller_id,callee_id));
create policy calls_update on calls for update to authenticated using(caller_id=auth.uid() or callee_id=auth.uid()) with check(caller_id=auth.uid() or callee_id=auth.uid());
create policy views_insert on profile_views for insert to authenticated with check(viewer_user_id=auth.uid());

create policy messages_update_sender on messages for update to authenticated using(sender_id=auth.uid()) with check(sender_id=auth.uid());
