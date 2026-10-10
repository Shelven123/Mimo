drop function if exists public.mimo_wallet_balance();
drop function if exists public.mimo_wallet_history(integer,integer);
drop index if exists public.mimo_wallet_history_owner_time;
-- No balances or transactions were changed.
