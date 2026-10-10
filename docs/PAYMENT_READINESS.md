# Payment checkpoint: configuration required

Current concrete result: own-user balance/ledger can be viewed. Recharge, gift spending and withdrawals are not activated. Existing recharges/gifts/earnings/withdrawal tables are foundations; no checkout/webhook Edge Function is deployed. No live charge or financial balance mutation was made during this work.

Required project-owner inputs before activating payment:

1. Which payment provider and merchant account will receive Mimo payments? Account onboarding/credentials must be configured through the provider/Supabase secure settings, not pasted into chat or committed to Git.
2. What MYR price buys each diamond amount? Currency defaults in the existing schema are MYR, but there is no approved recharge price list. Payment/diamond amounts must be server-owned, never accepted from the browser.
3. What Host/platform split, diamond payout conversion and withdrawal minimum apply? Existing zero defaults in host_earnings are not an approved commercial policy.

Implementation requirements for the next approved configuration: create checkout from server-owned packages; record pending order with authenticated owner; verify provider webhook signature/server credentials; idempotent successful payment reference; atomically record ledger and credit wallet only after verified payment; reject client-created paid receipts; handle duplicates, failures and refunds explicitly. Gift spending must lock/check/debit the wallet and write gift/earning/ledger records in one transaction, with retry idempotency. Withdrawals require server-side available balance reservation and authorized processing. None of these is claimed implemented by the wallet read release.

Independent device acceptance still required: notification delivery/settings/read state, appointment lifecycle and wallet display on two accounts. Production transactional notification smoke remains unverified because MCP returned Invalid or expired requestState twice; reproducible SQL is checked in.
