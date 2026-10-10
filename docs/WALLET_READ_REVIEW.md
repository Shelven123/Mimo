# Wallet balance and history

Implemented: Me → Wallet opens signed-in balance and paginated own-user transaction history. Me's balance also uses the exact read API. Diamond amounts are SQL text instead of lossy JavaScript Number; missing/error responses show Unavailable, not zero. Safe text rendering, login/retry and session-change cleanup included. Removed accidental outer Markdown fences in Me HTML. Recharge currently opens this read-only wallet and clearly states recharge is unavailable.

Database: two SECURITY INVOKER functions, empty search_path, actor fixed to auth.uid(), existing own-user SELECT RLS preserved, anonymous EXECUTE denied. Page bounds enforced. Owner/time index added. No credits, debits, recharge rows, earnings or withdrawals written.

Verified: 96 automatic checks including isolated PostgreSQL exact bigint/owner/no-UID/anonymous/pagination/rollback, safe rendering, errors and account-change cleanup; syntax/whitespace. Production migration/function/grant/RLS metadata verified. Production read with no Auth user returned zero wallet/history rows. Advisors unchanged; links recorded in NOTIFICATION_CENTER_REVIEW.md.

Not Verified: real signed-in phone balance/history and production transactional cross-user smoke. Earlier notification transaction attempts returned MCP request-state errors; no new transaction success is claimed.

Next payment inputs are absent: merchant/provider setup, recharge pricing/diamond mapping and Host/platform split/payout rules. Supabase currently has no Edge Functions; repository has no configured checkout/webhook implementation. Payment table foundations do not mean payment is working. See PAYMENT_READINESS.md before enabling money flows.

Rollback: revert frontend and apply database/rollback-wallet-reads.sql. Existing financial records remain unchanged.
