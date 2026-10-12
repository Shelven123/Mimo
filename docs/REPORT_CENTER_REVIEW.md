# Plaza Report Center — 2026-10-12

## Scope and behavior

Settings → Report Center and the submitted-report link open a paginated history of the authenticated user's Plaza reports. Cards show category, reason, submission time and status. Detail retains original text snapshot, evidence and append-only review responses, even when a Host deletes the original post. Three private evidence images are signed for 300 seconds with exact origin/path validation and stale-view guards. Scope/status filters, Home exit, refresh and review-history pagination are included. Review drafts survive failed saves and refresh; automatic foreground refresh pauses while writing a response. Logout/account changes clear private views/drafts and disable actions.

Confirmed admins can select Review queue, start a review, complete it or record no action taken. Terminal outcomes require a reporter-visible response of at most 2000 characters. Revision-based updates prevent a stale tab from overwriting another review. Final reviews cannot reopen or change their response. Review completion is an administrative decision, not automatic post removal, banning or payment action. No sanctions are added by this batch.

## Authorization and integrity

Managed migration `20261012075303_mimo_report_center.sql` extends existing plaza_reports with response/revision/time and creates RLS-protected plaza_report_reviews. User SELECT stays owner/admin-only. Admin-only UPDATE grants cover status and response exclusively. The invoker guard protects identities/snapshots/evidence and validates transitions, lengths and server-owned revision/time. It permits the existing FK ON DELETE SET NULL for Host-deleted posts without rewriting audit history. The public review RPC is an empty-search-path invoker, denies anonymous use and explicitly rechecks auth.uid()/database is_admin. Role checks do not use user-editable JWT metadata.

A private, empty-search-path, client-inexecutable definer trigger is used solely to append audit history without granting browser INSERT/UPDATE/DELETE/TRUNCATE on that history. Actor is checked again; status and audit write are atomic. Unique (report_id,revision) protects duplicate audit entries. Reporter can view their own review responses; other users and the reported Host cannot read them. Admin IDs are not requested by the UI. Existing evidence Storage rules are retained.

Fixed a confirmed name-resolution defect in the old report INSERT policy: unqualified author_id bound to the inner post alias, making p.author_id=p.author_id. ALTER POLICY now compares p.author_id=plaza_reports.author_id. Existing reporter/snapshot checks remain, and matching submission retries still work. No old reports are edited/backfilled.

## Verification status

Implemented: user history/status/evidence, filtered admin queue, guarded reviews and append-only audit; Settings and successful-submit navigation.

Automated Verified: 278 regression checks, including 12 new PostgreSQL/DOM checks covering original submission/retry, forged-author denial, owner isolation, admin compare-and-set, atomic audit, immutable fields, terminal response requirements, original-post deletion retention, no-UID/anonymous denial, rollback, escaped text, private signing, logout and failed-review draft retention. JavaScript and all three changed/new inline scripts checked.

Production Verified (metadata): migration version, RLS, trigger enablement, empty search paths, anonymous denial, invoker RPC and denied raw audit writes confirmed. Security advisors unchanged. Performance differs only by one removed report policy initplan warning and the new unused admin FK index; retain it to cover audit admin references ([Supabase guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)). No real customer report, review, file or sanction was created for testing.

User Verified: earlier notification banner/chime explicitly accepted; no acceptance yet for this Report Center batch. Not Verified: real iPhone visuals, actual signed-image HTTP, production two-account/admin workflow and true parallel-session concurrency. DOM/isolated Postgres tests are not those acceptance checks.

## Remaining and operational dependencies

The owner-designated, email-confirmed registered account was promoted on 2026-10-12 after an exact identity/profile match. Backend role and support/report administrator checks are verified. The account identity is intentionally omitted from the public repository. Real login/phone/review acceptance is still pending; no other account was elevated. Review notifications, sanctions/takedown/appeals, internal-only notes, legacy generic reports-table UI and evidence retention/rate limiting remain separate work. Existing customer reports and evidence are retained. This release does not complete moderation operations or payments.

## Safe rollback

Revert frontend entry/module/page changes and apply database/rollback-report-center.sql to revoke review API/status-response writes. Retain RLS, corrected submission policy, report columns and review history. Do not delete reports or evidence, drop private storage or remove unrelated policies/triggers. Two initial migration calls failed with expired requestState; metadata confirmed zero partial changes. The non-destructive ALTER POLICY version subsequently applied successfully.

## 2026-10-12 Host-channel continuation

The Hosts channel, guarded Host reporting/screenshots/review history and profile entry are now implemented; see docs/HOST_PROFILE_REVIEW.md. Admin queue is the default view. The old statement about generic report UI being pending is superseded for Host reports only; automatic sanctions and notifications still remain separate.
