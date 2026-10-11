-- New authenticated Host posts only; never replay historical posts.
create function mimo_private.emit_followed_post_notification() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>new.author_id or not exists(
  select 1 from public.profiles where id=new.author_id and role='host'
 ) then return new; end if;
 insert into public.notifications(user_id,notification_type,title,content,related_user_id,related_id)
 select f.follower_id,'activity','New update from a Host you follow',
  'Open the update to view it.',new.author_id,new.id
 from public.follows f
 left join public.notification_settings s on s.user_id=f.follower_id
 where f.following_id=new.author_id and f.follower_id<>new.author_id
 and s.activity_posts is distinct from false
 and not exists(select 1 from public.blocked_users b where
  (b.blocker_id=f.follower_id and b.blocked_id=new.author_id) or
  (b.blocker_id=new.author_id and b.blocked_id=f.follower_id))
 and not exists(select 1 from public.notifications n where n.user_id=f.follower_id
  and n.notification_type='activity' and n.related_user_id=new.author_id and n.related_id=new.id);
 return new;
end $$;
revoke all on function mimo_private.emit_followed_post_notification() from public,anon,authenticated;
create trigger mimo_followed_post_notification after insert on public.posts
for each row execute function mimo_private.emit_followed_post_notification();
