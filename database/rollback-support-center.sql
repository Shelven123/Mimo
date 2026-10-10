-- Disable frontend APIs; retain append-only history and lifecycle protections.
drop function if exists public.mimo_open_support(uuid,text,text,text);
drop function if exists public.mimo_reply_support(uuid,uuid,text);
drop function if exists public.mimo_support_transition(uuid,text,text,text);
drop function if exists public.mimo_support_access();
-- Do not restore unsafe client grants or delete existing tickets/replies.
