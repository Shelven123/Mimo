-- Explicit defense in depth for the private backend-only receipt store.
create policy mimo_no_client_receipts on mimo_private.recharge_receipts as restrictive
for all to anon,authenticated using(false) with check(false);
