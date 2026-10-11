-- New interactions only; no historical replay.
create function mimo_private.emit_plaza_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); recipient uuid; enabled boolean; kind text;
begin
 if actor is null or actor<>new.user_id then return new; end if;
 select author_id into recipient from public.posts where id=new.post_id;
 if recipient is null or recipient=actor then return new; end if;
 if exists(select 1 from public.blocked_users where (blocker_id=recipient and blocked_id=actor) or (blocker_id=actor and blocked_id=recipient)) then return new; end if;
 select activity_posts into enabled from public.notification_settings where user_id=recipient;
 if enabled=false then return new; end if;
 kind:=case when tg_table_name='post_likes' then 'like' else 'comment' end;
 if kind='like' then
  -- Serialize matching likes, and suppress repeated unlike/re-like notification spam.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mimo-like-notice/'||new.post_id::text||'/'||actor::text,0));
  if exists(select 1 from public.notifications where user_id=recipient and notification_type='like' and related_id=new.post_id and related_user_id=actor) then return new; end if;
 end if;
 insert into public.notifications(user_id,notification_type,title,content,related_user_id,related_id)
 values(recipient,kind,case kind when 'like' then 'Someone liked your update' else 'New comment on your update' end,'Open your update to view this interaction.',actor,new.post_id);
 return new;
end $$;
revoke all on function mimo_private.emit_plaza_notification() from public,anon,authenticated;
create trigger mimo_plaza_like_notification after insert on public.post_likes for each row execute function mimo_private.emit_plaza_notification();
create trigger mimo_plaza_comment_notification after insert on public.post_comments for each row execute function mimo_private.emit_plaza_notification();
