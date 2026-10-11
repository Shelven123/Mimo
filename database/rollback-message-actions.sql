-- Disable further edits/recalls; retain tombstones and column protections.
revoke all on function public.mimo_recall_message(uuid,integer),public.mimo_edit_message(uuid,integer,text),mimo_private.change_message(uuid,integer,text,boolean) from public,anon,authenticated;
-- Cleared message payloads cannot be restored. Do not drop metadata/constraints
-- or regrant broad client UPDATE, which would allow forged or restored content.
notify pgrst,'reload schema';
