-- New replies only. Keep existing post-owner notification behavior intact.
create function mimo_private.emit_comment_reply_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); recipient uuid; post_owner uuid; enabled boolean;
begin
 if actor is null or actor<>new.user_id or new.parent_id is null then return new; end if;
 select c.user_id,p.author_id into recipient,post_owner
 from public.post_comments c join public.posts p on p.id=c.post_id
 where c.id=new.parent_id and c.post_id=new.post_id and c.parent_id is null;
 -- Existing post producer already handles a reply to the post author.
 if recipient is null or recipient=actor or recipient=post_owner then return new; end if;
 if exists(select 1 from public.blocked_users where
  (blocker_id=recipient and blocked_id in (actor,post_owner)) or
  (blocked_id=recipient and blocker_id in (actor,post_owner))) then return new; end if;
 select activity_posts into enabled from public.notification_settings where user_id=recipient;
 if enabled=false then return new; end if;
 insert into public.notifications(user_id,notification_type,title,content,related_user_id,related_id)
 values(recipient,'comment','Someone replied to your comment','Open the update to view this reply.',actor,new.post_id);
 return new;
end $$;
revoke all on function mimo_private.emit_comment_reply_notification() from public,anon,authenticated;
create trigger mimo_comment_reply_notification after insert on public.post_comments
for each row execute function mimo_private.emit_comment_reply_notification();
