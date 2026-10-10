-- Own-user read APIs, with exact bigint values returned as text.
create function public.mimo_wallet_balance() returns table(diamonds text)
language sql stable security invoker set search_path='' as $$
 select w.diamonds::text from public.wallets w where w.user_id=auth.uid()
$$;
revoke all on function public.mimo_wallet_balance() from public,anon;
grant execute on function public.mimo_wallet_balance() to authenticated;
create function public.mimo_wallet_history(page_size integer default 30,page_offset integer default 0)
returns table(id uuid,transaction_type text,amount_diamonds text,balance_before text,balance_after text,description text,created_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select t.id,t.transaction_type,t.amount_diamonds::text,t.balance_before::text,t.balance_after::text,t.description,t.created_at
 from public.wallet_transactions t where t.user_id=auth.uid()
 order by t.created_at desc,t.id desc
 limit greatest(1,least(coalesce(page_size,30),100)) offset greatest(0,coalesce(page_offset,0))
$$;
revoke all on function public.mimo_wallet_history(integer,integer) from public,anon;
grant execute on function public.mimo_wallet_history(integer,integer) to authenticated;
create index if not exists mimo_wallet_history_owner_time on public.wallet_transactions(user_id,created_at desc,id desc);
