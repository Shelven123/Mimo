begin;
drop function if exists public.mimo_inbox(integer,integer);
drop function if exists public.mimo_mark_read(uuid,uuid[]);
drop function if exists mimo_private.mark_messages_read(uuid,uuid[]);
drop trigger if exists mimo_message_receipt on public.messages;
drop function if exists mimo_private.guard_read_receipt();
drop policy if exists mimo_message_initial_unread on public.messages;
drop index if exists public.mimo_messages_unread;
commit;
