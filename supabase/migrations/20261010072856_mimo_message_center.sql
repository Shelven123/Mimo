-- Summary reads keep the caller's existing RLS. No actor ID is accepted.
create function public.mimo_inbox(page_size integer default 30, page_offset integer default 0)
returns table(conversation_id uuid,contact_id uuid,display_name text,username text,avatar_url text,
  last_content text,last_type text,last_sender uuid,activity_at timestamptz,unread_count bigint)
language sql stable security invoker set search_path = '' as $$
  select c.id, case when c.user_one_id=auth.uid() then c.user_two_id else c.user_one_id end,
    p.display_name,p.username,p.avatar_url,left(m.content,240),m.message_type,m.sender_id,
    coalesce(m.created_at,c.created_at),
    (select count(*) from public.messages u where u.conversation_id=c.id
      and u.sender_id<>auth.uid() and u.is_read=false)
  from public.conversations c
  left join public.profiles p on p.id=case when c.user_one_id=auth.uid() then c.user_two_id else c.user_one_id end
  left join lateral (select x.content,x.message_type,x.sender_id,x.created_at from public.messages x
    where x.conversation_id=c.id order by x.created_at desc,x.id desc limit 1) m on true
  where auth.uid() is not null and (c.user_one_id=auth.uid() or c.user_two_id=auth.uid())
  order by coalesce(m.created_at,c.created_at) desc,c.id desc
  limit greatest(1,least(coalesce(page_size,30),100)) offset greatest(0,coalesce(page_offset,0))
$$;
revoke all on function public.mimo_inbox(integer,integer) from public,anon;
grant execute on function public.mimo_inbox(integer,integer) to authenticated;

-- Recipient acknowledgements need a narrowly scoped privileged operation because
-- the existing UPDATE policy is sender-only. This helper never updates content.
create function mimo_private.mark_messages_read(chat_id uuid, message_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); other_user uuid; affected integer;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select case when user_one_id=actor then user_two_id else user_one_id end into other_user
    from public.conversations where id=chat_id and (user_one_id=actor or user_two_id=actor);
  if other_user is null then raise exception 'Not a conversation participant' using errcode='42501'; end if;
  if coalesce(cardinality(message_ids),0)>1000 then raise exception 'Too many acknowledgements' using errcode='22023'; end if;
  update public.messages set is_read=true where conversation_id=chat_id and sender_id=other_user
    and id=any(message_ids) and is_read=false;
  get diagnostics affected=row_count;
  return affected;
end $$;
revoke all on function mimo_private.mark_messages_read(uuid,uuid[]) from public,anon;
grant execute on function mimo_private.mark_messages_read(uuid,uuid[]) to authenticated;
create function public.mimo_mark_read(chat_id uuid,message_ids uuid[])
returns integer language sql security invoker set search_path = '' as $$
select mimo_private.mark_messages_read(chat_id,message_ids)
$$;
revoke all on function public.mimo_mark_read(uuid,uuid[]) from public,anon;
grant execute on function public.mimo_mark_read(uuid,uuid[]) to authenticated;

-- A sender must not forge receipt flags by inserting or editing their own rows.
create policy mimo_message_initial_unread on public.messages as restrictive for insert to authenticated
with check(is_read=false);
create function mimo_private.guard_read_receipt() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user='authenticated' and new.is_read is distinct from old.is_read then
    raise exception 'Read receipts require recipient acknowledgement' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function mimo_private.guard_read_receipt() from public,anon;
grant execute on function mimo_private.guard_read_receipt() to authenticated;
create trigger mimo_message_receipt before update on public.messages for each row execute function mimo_private.guard_read_receipt();
create index mimo_messages_unread on public.messages(conversation_id,sender_id) where is_read=false;
