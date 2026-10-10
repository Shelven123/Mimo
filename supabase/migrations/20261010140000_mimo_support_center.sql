-- Existing support ownership/admin RLS is retained; client lifecycle is narrowed.
create schema if not exists mimo_private;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.support_tickets,public.support_messages from anon;
revoke delete,truncate,references,trigger on public.support_tickets from authenticated;
revoke update,delete,truncate,references,trigger on public.support_messages from authenticated;
grant select,insert,update on public.support_tickets to authenticated;
grant select,insert on public.support_messages to authenticated;

create function mimo_private.guard_support_ticket() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor uuid := auth.uid(); admin boolean;
begin
 if actor is null then
  if current_user in ('anon','authenticated') then raise exception 'Sign in required' using errcode='42501'; end if;
  return new;
 end if;
 admin := public.is_admin(actor);
 if tg_op='INSERT' then
  if new.user_id<>actor or new.status<>'open' or new.priority<>'normal' or char_length(btrim(new.subject)) not between 1 and 120 then raise exception 'Invalid support request' using errcode='42501'; end if;
  new.subject:=btrim(new.subject); new.created_at:=now(); new.updated_at:=now();
 else
  if row(new.id,new.user_id,new.subject,new.category,new.created_at) is distinct from row(old.id,old.user_id,old.subject,old.category,old.created_at) then raise exception 'Ticket identity is immutable' using errcode='42501'; end if;
  if not admin and (old.user_id<>actor or new.priority<>old.priority or (new.status<>old.status and new.status<>'closed')) then raise exception 'Only support may manage this ticket' using errcode='42501'; end if;
  if old.status='closed' and row(new.status,new.priority) is distinct from row(old.status,old.priority) then raise exception 'Closed tickets cannot reopen' using errcode='42501'; end if;
  if admin and new.status<>old.status and not (
    (old.status='open' and new.status in ('in_progress','resolved','closed')) or
    (old.status='in_progress' and new.status in ('resolved','closed')) or
    (old.status='resolved' and new.status in ('in_progress','closed'))
  ) then raise exception 'Invalid support transition' using errcode='42501'; end if;
  new.updated_at:=now();
 end if;
 return new;
end $$;
create function mimo_private.guard_support_message() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); ticket public.support_tickets;
begin
 if actor is null then
  if current_user in ('anon','authenticated') then raise exception 'Sign in required' using errcode='42501'; end if;
  return new;
 end if;
 select * into ticket from public.support_tickets where id=new.ticket_id for update;
 if not found or new.sender_id<>actor or (ticket.user_id<>actor and not public.is_admin(actor)) or ticket.status not in ('open','in_progress') or char_length(btrim(new.message)) not between 1 and 4000 or coalesce(new.attachment_url,'')<>'' then raise exception 'Reply unavailable or invalid' using errcode='42501'; end if;
 new.message:=btrim(new.message);new.created_at:=now();new.attachment_url:=null;
 return new;
end $$;
revoke all on function mimo_private.guard_support_ticket(),mimo_private.guard_support_message() from public,anon,authenticated;
create trigger mimo_support_ticket_guard before insert or update on public.support_tickets for each row execute function mimo_private.guard_support_ticket();
create trigger mimo_support_message_guard before insert on public.support_messages for each row execute function mimo_private.guard_support_message();

create function public.mimo_open_support(request_id uuid,ticket_subject text,ticket_category text,body text) returns uuid language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); existing public.support_tickets; first_body text;
begin
 if actor is null or request_id is null then raise exception 'Sign in and request ID required' using errcode='42501'; end if;
 insert into public.support_tickets(id,user_id,subject,category) values(request_id,actor,btrim(ticket_subject),ticket_category) on conflict(id) do nothing;
 if found then
  insert into public.support_messages(ticket_id,sender_id,message) values(request_id,actor,body);
 else
  select * into existing from public.support_tickets where id=request_id;
  select message into first_body from public.support_messages where ticket_id=request_id order by created_at,id limit 1;
  if existing.id is null or existing.user_id<>actor or existing.subject is distinct from btrim(ticket_subject) or existing.category is distinct from ticket_category or first_body is distinct from btrim(body) then raise exception 'Request ID already used' using errcode='42501'; end if;
 end if;
 return request_id;
end $$;
create function public.mimo_reply_support(request_id uuid,target_ticket uuid,body text) returns uuid language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); existing public.support_messages;
begin
 if actor is null or request_id is null then raise exception 'Sign in and request ID required' using errcode='42501'; end if;
 select * into existing from public.support_messages where id=request_id;
 if found then
  if existing.sender_id<>actor or existing.ticket_id<>target_ticket or existing.message is distinct from btrim(body) then raise exception 'Request ID already used' using errcode='42501'; end if;
  return request_id;
 end if;
 insert into public.support_messages(id,ticket_id,sender_id,message) values(request_id,target_ticket,actor,body) on conflict(id) do nothing;
 if not found then
  select * into existing from public.support_messages where id=request_id;
  if existing.id is null or existing.sender_id<>actor or existing.ticket_id<>target_ticket or existing.message is distinct from btrim(body) then raise exception 'Request ID already used' using errcode='42501'; end if;
 end if;
 return request_id;
end $$;
create function public.mimo_support_transition(target_ticket uuid,expected_status text,next_status text,next_priority text default null) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 update public.support_tickets set status=next_status,priority=coalesce(next_priority,priority) where id=target_ticket and status=expected_status;
 return found;
end $$;
create function public.mimo_support_access() returns boolean language sql stable security invoker set search_path='' as $$select auth.uid() is not null and public.is_admin(auth.uid())$$;
revoke all on function public.mimo_open_support(uuid,text,text,text),public.mimo_reply_support(uuid,uuid,text),public.mimo_support_transition(uuid,text,text,text),public.mimo_support_access() from public,anon;
grant execute on function public.mimo_open_support(uuid,text,text,text),public.mimo_reply_support(uuid,uuid,text),public.mimo_support_transition(uuid,text,text,text),public.mimo_support_access() to authenticated;
