alter table public.messages add column recalled_at timestamptz;
alter table public.messages add column edited_at timestamptz;
alter table public.messages add column action_revision integer not null default 0 check(action_revision>=0);
alter table public.messages add constraint mimo_recalled_shape check(recalled_at is null or (message_type='system' and content='Message recalled' and image_url is null and video_url is null and audio_url is null and audio_duration_ms is null));
-- Clients may insert ordinary messages, never forge action metadata or mutate rows directly.
create function mimo_private.guard_message_action_state() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user='authenticated' and (new.recalled_at is not null or new.edited_at is not null or new.action_revision<>0) then raise exception 'Message actions require authorized API' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function mimo_private.guard_message_action_state() from public,anon,authenticated;
create trigger mimo_message_action_insert before insert on public.messages for each row execute function mimo_private.guard_message_action_state();
revoke update on public.messages from authenticated;
do $$declare col text;begin for col in select attname from pg_attribute where attrelid='public.messages'::regclass and attnum>0 and not attisdropped loop execute format('revoke update (%I) on public.messages from authenticated',col);end loop;end $$;

-- Narrow privilege is necessary to erase immutable media references during recall.
create function mimo_private.change_message(target_message uuid,expected_revision integer,next_text text,recall boolean) returns setof public.messages language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); previous public.messages; other_user uuid;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into previous from public.messages where id=target_message for update;
 if previous.id is null or previous.sender_id<>actor then raise exception 'Only your messages may be changed' using errcode='42501'; end if;
 select case when user_one_id=actor then user_two_id else user_one_id end into other_user from public.conversations where id=previous.conversation_id and actor in(user_one_id,user_two_id);
 if other_user is null then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 if recall is true then
  if previous.recalled_at is not null then return query select * from public.messages where id=target_message;return;end if;
  if expected_revision is distinct from previous.action_revision then raise exception 'Message changed. Refresh before recalling.' using errcode='40001'; end if;
  update public.messages set recalled_at=now(),content='Message recalled',message_type='system',image_url=null,video_url=null,audio_url=null,audio_duration_ms=null,action_revision=action_revision+1 where id=target_message;
 else
  if previous.recalled_at is not null or previous.message_type<>'text' or next_text is null or char_length(btrim(next_text)) not between 1 and 1000 or not mimo_private.contact_allowed(other_user,'message') then raise exception 'Text editing unavailable' using errcode='42501'; end if;
  if previous.action_revision=expected_revision+1 and previous.content=btrim(next_text) then return query select * from public.messages where id=target_message;return;end if;
  if expected_revision is distinct from previous.action_revision then raise exception 'Message changed. Refresh before editing.' using errcode='40001'; end if;
  if previous.content is distinct from btrim(next_text) then update public.messages set content=btrim(next_text),edited_at=now(),action_revision=action_revision+1 where id=target_message;end if;
 end if;
 -- Old message previews must not retain the previous text after an edit/recall.
 update public.notifications set content='Message updated. Open the conversation to view it.' where notification_type='message' and related_id=previous.conversation_id and related_user_id=actor and user_id=other_user;
 return query select * from public.messages where id=target_message;
end $$;
revoke all on function mimo_private.change_message(uuid,integer,text,boolean) from public,anon;
grant execute on function mimo_private.change_message(uuid,integer,text,boolean) to authenticated;
create function public.mimo_recall_message(target_message uuid,expected_revision integer) returns setof public.messages language sql security invoker set search_path='' as $$select * from mimo_private.change_message(target_message,expected_revision,null,true)$$;
create function public.mimo_edit_message(target_message uuid,expected_revision integer,next_text text) returns setof public.messages language sql security invoker set search_path='' as $$select * from mimo_private.change_message(target_message,expected_revision,next_text,false)$$;
revoke all on function public.mimo_recall_message(uuid,integer),public.mimo_edit_message(uuid,integer,text) from public,anon;
grant execute on function public.mimo_recall_message(uuid,integer),public.mimo_edit_message(uuid,integer,text) to authenticated;

notify pgrst,'reload schema';
