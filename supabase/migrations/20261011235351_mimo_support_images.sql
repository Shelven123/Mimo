insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mimo-support-images','mimo-support-images',false,3145728,array['image/jpeg']);
create policy mimo_support_image_upload on storage.objects for insert to authenticated with check(
 bucket_id='mimo-support-images' and (select auth.uid()) is not null and split_part(name,'/',1)=(select auth.uid())::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$');
create policy mimo_support_image_read on storage.objects for select to authenticated using(
 bucket_id='mimo-support-images' and (select auth.uid()) is not null and (
 split_part(name,'/',1)=(select auth.uid())::text or exists(select 1 from public.support_messages m
 where m.attachment_url=objects.name)));
create index mimo_support_attachment_path on public.support_messages(attachment_url) where attachment_url is not null;
-- No client UPDATE/DELETE: references and failed-upload paths cannot be replaced or raced against registration.
create or replace function mimo_private.guard_support_message() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); ticket public.support_tickets;
begin
 if actor is null then
  if current_user in ('anon','authenticated') then raise exception 'Sign in required' using errcode='42501'; end if;
  return new;
 end if;
 select * into ticket from public.support_tickets where id=new.ticket_id for update;
 if not found or new.sender_id<>actor or (ticket.user_id<>actor and not public.is_admin(actor))
 or ticket.status not in ('open','in_progress') or char_length(btrim(new.message)) not between 1 and 4000
 then raise exception 'Reply unavailable or invalid' using errcode='42501'; end if;
 if new.attachment_url is not null and (
  new.attachment_url<>actor::text||'/'||new.ticket_id::text||'/'||new.id::text||'.jpg'
  or not exists(select 1 from storage.objects where bucket_id='mimo-support-images' and name=new.attachment_url)
 ) then raise exception 'Image unavailable or invalid' using errcode='42501'; end if;
 new.message:=btrim(new.message);new.created_at:=now();
 return new;
end $$;
create function public.mimo_open_support_image(request_id uuid,ticket_subject text,ticket_category text,body text,image_path text) returns uuid language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); ticket public.support_tickets; first_message public.support_messages;
begin
 if actor is null or request_id is null or image_path is null then raise exception 'Sign in and image required' using errcode='42501'; end if;
 insert into public.support_tickets(id,user_id,subject,category) values(request_id,actor,btrim(ticket_subject),ticket_category) on conflict(id) do nothing;
 if found then
  insert into public.support_messages(id,ticket_id,sender_id,message,attachment_url) values(request_id,request_id,actor,body,image_path);
 else
  select * into ticket from public.support_tickets where id=request_id;
  select * into first_message from public.support_messages where id=request_id and ticket_id=request_id;
  if ticket.id is null or ticket.user_id<>actor or ticket.subject is distinct from btrim(ticket_subject)
  or ticket.category is distinct from ticket_category or first_message.id is null
  or first_message.sender_id<>actor or first_message.message is distinct from btrim(body)
  or first_message.attachment_url is distinct from image_path then raise exception 'Request ID already used' using errcode='42501'; end if;
 end if;
 return request_id;
end $$;
create function public.mimo_reply_support_image(request_id uuid,target_ticket uuid,body text,image_path text) returns uuid language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); previous public.support_messages;
begin
 if actor is null or request_id is null or image_path is null then raise exception 'Sign in and image required' using errcode='42501'; end if;
 select * into previous from public.support_messages where id=request_id;
 if found then
  if previous.sender_id<>actor or previous.ticket_id<>target_ticket or previous.message is distinct from btrim(body)
  or previous.attachment_url is distinct from image_path then raise exception 'Request ID already used' using errcode='42501'; end if;
  return request_id;
 end if;
 insert into public.support_messages(id,ticket_id,sender_id,message,attachment_url)
 values(request_id,target_ticket,actor,body,image_path) on conflict(id) do nothing;
 if not found then
  select * into previous from public.support_messages where id=request_id;
  if previous.id is null or previous.sender_id<>actor or previous.ticket_id<>target_ticket
  or previous.message is distinct from btrim(body) or previous.attachment_url is distinct from image_path
  then raise exception 'Request ID already used' using errcode='42501'; end if;
 end if;
 return request_id;
end $$;
revoke all on function public.mimo_open_support_image(uuid,text,text,text,text),public.mimo_reply_support_image(uuid,uuid,text,text) from public,anon;
grant execute on function public.mimo_open_support_image(uuid,text,text,text,text),public.mimo_reply_support_image(uuid,uuid,text,text) to authenticated;
