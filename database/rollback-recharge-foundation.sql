-- Preserve new columns, packages, receipts and indexes as financial evidence.
-- Do not restore the old raw client INSERT grant/forgery path.
drop function if exists public.mimo_create_recharge(uuid,uuid);
drop function if exists public.mimo_confirm_recharge(uuid,text,text,bigint,text);
drop function if exists public.mimo_recharge_packages();
drop function if exists public.mimo_recharge_history(integer,integer);
drop function if exists mimo_private.create_recharge(uuid,uuid);
drop function if exists mimo_private.confirm_recharge(uuid,text,text,bigint,text);
-- Rolling back disables APIs; existing funds/history are not reversed or removed.
