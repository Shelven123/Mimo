# Upload management

Entry: Settings → Uploads & Storage. Lists only the signed-in user's mimo-media object metadata, 30 at a time with a path cursor and lookahead. Shows filename, category, size, upload date and referenced/unused state. No signed URL, automatic playback, bulk deletion, automatic cleanup or customer file mutation during deployment/testing.

## Removal contract

Explicit Remove → confirmation → server discard claim → single-file Storage SDK remove. Only own unreferenced files at least 24 hours old can be claimed. Client checks are presentation; the claim trigger and RLS enforce ownership, age and reference checks. Published photos/Reels and sent chat photos are protected, including readable blocked history. Deleted post files become unused; recent unreferenced uploads stay protected for draft retries.

Claim registration and authenticated post/message reference registration take the same per-path transaction advisory lock. Reference locks are ordered. The post/message guard rejects claimed paths, and the claim guard checks references AFTER acquiring the lock using a VOLATILE fresh-snapshot query under READ COMMITTED (production default verified). Publication winning first blocks cleanup; a discard claim winning first blocks publication. Requests already in progress can fail safely and be retried. Production parallel-session behavior remains Not Verified.

Claims are permanent, own-user SELECT/INSERT only, authenticated trigger checks and server timestamp. No client UPDATE/DELETE/TRUNCATE. Ordinary clients cannot release a discarded path or reupload it. A failed removal leaves a discarded, still-owned object available for another removal attempt. An old draft must reselect the file to obtain a new request/path; no promise to restore the discarded copy. This is stated in the confirmation.

Why claims persist: Supabase Storage's delete implementation performs rolled-back RLS permission probes before applying deletes as the Storage service. Locks acquired solely inside a DELETE policy would not span that whole operation. A committed claim remains effective through the probe rollback and subsequent physical deletion. Source inspected: https://github.com/supabase/storage/blob/master/src/storage/object.ts (`deleteObjects`, `authorizeDeleteTargets`). The deployed service version itself is not asserted identical to master. Permanent claims keep the rule conservative even if permission checking is separate.

Object deletion uses Storage API exclusively, never SQL metadata deletion. Supabase guidance: https://supabase.com/docs/guides/storage/schema/design . Migration modifies policies, public app tables and private guards; does not alter the Storage schema or customer objects.

## Verification

179 automated checks pass: added owner-only inventory/paging, recent/old referenced denial, claim-before-delete, permanent claim after simulated permission-probe rollback, discarded publish/reupload denial, no release/forged owner, anonymous API denial, safe filename rendering, explicit confirmation, failed-response feedback/retry and late logout suppression. Existing photo/Reel retry and chat send tests pass. Syntax and whitespace pass. PGlite tests use isolated simulated Storage metadata, not real S3 removal.

Production migration/metadata/no-auth empty read and security-advisor results are recorded after deployment in the handover. No real customer object is removed for verification. NOT VERIFIED: real authenticated Storage HTTP deletion, parallel production transactions, physical-phone page acceptance and quota accounting. Incomplete: automatic retention, per-user quotas, report-evidence cleanup, transcoding, resumable upload and moderation. The page is a paginated inventory, not a total account storage/quota meter.

Safe rollback: database/rollback-upload-manager.sql disables new cleanup and RPC access while retaining all claims, guards, references and files. Never restore the earlier unclaimed DELETE policy or delete claims after a lost deletion response.

Production verification (2026-10-11 UTC): migration successfully applied. Claim-table RLS/owner policies and denied client mutation/release, Storage discard/reuse policies, invoker/VOLATILE functions, anonymous API denial, authenticated grants and no-UID zero-row inventory verified. Advisors unchanged; existing remediation references: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable , https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable , https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable , https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . No customer files or claims changed for verification.
