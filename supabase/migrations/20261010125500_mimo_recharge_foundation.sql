-- No seed prices or enabled packages: merchant/package approval is still needed.
create table public.recharge_packages(
 id uuid primary key default gen_random_uuid(),name text not null check(char_length(name) between 1 and 80),
 diamonds bigint not null check(diamonds>0),amount_minor bigint not null check(amount_minor>0),
 currency text not null default 'MYR' check(currency='MYR'),
 provider text not null check(provider ~ '^[a-z][a-z0-9_-]{1,49}$'),
 is_active boolean not null default false,created_at timestamptz not null default now()
);
alter table public.recharge_packages enable row level security;
revoke all on public.recharge_packages from anon,authenticated;
grant select on public.recharge_packages to authenticated;
grant select,insert,update,delete on public.recharge_packages to service_role;
create policy mimo_active_recharge_packages on public.recharge_packages for select to authenticated using(is_active);
alter table public.recharges add column package_id uuid references public.recharge_packages(id),
 add column request_key uuid,add column amount_minor bigint check(amount_minor>0);
create unique index mimo_recharge_request_key on public.recharges(user_id,request_key) where request_key is not null;
create index mimo_recharge_owner_time on public.recharges(user_id,created_at desc,id desc);
-- The browser must never supply a paid record or choose financial values.
revoke insert,update,delete,truncate,references,trigger on public.recharges from anon,authenticated;
create policy mimo_recharge_no_client_insert on public.recharges as restrictive for insert to authenticated with check(false);

create table mimo_private.recharge_receipts(
 provider text not null,reference text not null,order_id uuid not null unique references public.recharges(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(provider,reference)
);
alter table mimo_private.recharge_receipts enable row level security;
revoke all on mimo_private.recharge_receipts from public,anon,authenticated,service_role;

create function mimo_private.create_recharge(selected_package uuid,retry_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); old_order public.recharges%rowtype; package public.recharge_packages%rowtype; order_id uuid;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if retry_key is null then raise exception 'Request key required' using errcode='22023'; end if;
 select * into old_order from public.recharges where user_id=actor and request_key=retry_key;
 if found then
   if old_order.package_id is distinct from selected_package then raise exception 'Request key already used' using errcode='22023'; end if;
   return old_order.id;
 end if;
 select * into package from public.recharge_packages where id=selected_package and is_active for share;
 if not found then raise exception 'Recharge package unavailable' using errcode='22023'; end if;
 insert into public.recharges(user_id,diamonds,amount,currency,payment_provider,status,package_id,request_key,amount_minor)
 values(actor,package.diamonds,package.amount_minor::numeric/100,package.currency,package.provider,'pending',package.id,retry_key,package.amount_minor)
 on conflict(user_id,request_key) where request_key is not null do nothing returning id into order_id;
 if order_id is null then
   select * into old_order from public.recharges where user_id=actor and request_key=retry_key;
   if old_order.package_id is distinct from selected_package then raise exception 'Request key already used' using errcode='22023'; end if;
   order_id:=old_order.id;
 end if;
 return order_id;
end $$;
revoke all on function mimo_private.create_recharge(uuid,uuid) from public,anon;
grant execute on function mimo_private.create_recharge(uuid,uuid) to authenticated;
create function public.mimo_create_recharge(selected_package uuid,retry_key uuid) returns uuid
language sql security invoker set search_path='' as $$select mimo_private.create_recharge(selected_package,retry_key)$$;
revoke all on function public.mimo_create_recharge(uuid,uuid) from public,anon;
grant execute on function public.mimo_create_recharge(uuid,uuid) to authenticated;

-- Contract: trusted backend has already verified the provider event/signature.
-- This is accounting, not provider-webhook verification or a checkout endpoint.
create function mimo_private.confirm_recharge(recharge_id uuid,event_provider text,event_reference text,event_amount_minor bigint,event_currency text)
returns boolean language plpgsql security definer set search_path='' as $$
declare purchase public.recharges%rowtype; previous_balance bigint;
begin
 select * into purchase from public.recharges where id=recharge_id for update;
 if not found or purchase.package_id is null or purchase.request_key is null or purchase.amount_minor is null then
   raise exception 'Recharge order unavailable' using errcode='22023';
 end if;
 if event_provider is distinct from purchase.payment_provider or event_currency is distinct from purchase.currency
   or event_amount_minor is distinct from purchase.amount_minor or event_reference is null
   or char_length(event_reference) not between 1 and 200 or btrim(event_reference)='' then
   raise exception 'Payment does not match order' using errcode='22023';
 end if;
 if purchase.status='paid' then
   if purchase.payment_reference is distinct from event_reference then raise exception 'Order already paid with another receipt' using errcode='22023'; end if;
   return false;
 end if;
 if purchase.status<>'pending' then raise exception 'Order is not pending' using errcode='22023'; end if;
 if exists(select 1 from public.recharges r where r.id<>purchase.id and r.status='paid'
   and r.payment_provider=event_provider and r.payment_reference=event_reference) then
   raise exception 'Receipt already recorded on another order' using errcode='22023';
 end if;
 insert into mimo_private.recharge_receipts(provider,reference,order_id) values(event_provider,event_reference,purchase.id);
 select diamonds into previous_balance from public.wallets where user_id=purchase.user_id for update;
 if not found or previous_balance<0 then raise exception 'Wallet unavailable' using errcode='22023'; end if;
 update public.wallets set diamonds=previous_balance+purchase.diamonds where user_id=purchase.user_id;
 insert into public.wallet_transactions(user_id,transaction_type,amount_diamonds,balance_before,balance_after,related_id,description)
 values(purchase.user_id,'recharge',purchase.diamonds,previous_balance,previous_balance+purchase.diamonds,purchase.id,'Verified recharge');
 update public.recharges set status='paid',payment_reference=event_reference,paid_at=now() where id=purchase.id;
 return true;
end $$;
revoke all on function mimo_private.confirm_recharge(uuid,text,text,bigint,text) from public,anon,authenticated;
grant usage on schema mimo_private to service_role;
grant execute on function mimo_private.confirm_recharge(uuid,text,text,bigint,text) to service_role;
create function public.mimo_confirm_recharge(recharge_id uuid,event_provider text,event_reference text,event_amount_minor bigint,event_currency text)
returns boolean language sql security invoker set search_path='' as $$
 select mimo_private.confirm_recharge(recharge_id,event_provider,event_reference,event_amount_minor,event_currency)
$$;
revoke all on function public.mimo_confirm_recharge(uuid,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.mimo_confirm_recharge(uuid,text,text,bigint,text) to service_role;

create function public.mimo_recharge_packages()
returns table(id uuid,name text,diamonds text,amount_minor text,currency text)
language sql stable security invoker set search_path='' as $$
 select p.id,p.name,p.diamonds::text,p.amount_minor::text,p.currency from public.recharge_packages p
 where p.is_active order by p.amount_minor,p.id
$$;
revoke all on function public.mimo_recharge_packages() from public,anon;
grant execute on function public.mimo_recharge_packages() to authenticated;
create function public.mimo_recharge_history(page_size integer default 30,page_offset integer default 0)
returns table(id uuid,diamonds text,amount text,currency text,status text,created_at timestamptz,paid_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select r.id,r.diamonds::text,r.amount::text,r.currency,r.status,r.created_at,r.paid_at
 from public.recharges r where r.user_id=auth.uid() order by r.created_at desc,r.id desc
 limit greatest(1,least(coalesce(page_size,30),100)) offset greatest(0,coalesce(page_offset,0))
$$;
revoke all on function public.mimo_recharge_history(integer,integer) from public,anon;
grant execute on function public.mimo_recharge_history(integer,integer) to authenticated;
