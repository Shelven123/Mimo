# Contact permissions: ready for deployment review

Status: implemented and locally verified; **not deployed**. Production migration was rejected by automatic approval review because it changes core access controls. The live database was checked afterward: the new RPC and policies do not exist. Frontend changes must not be published before the database migration.

## Behavior

| Setting/action | New behavior |
| --- | --- |
| Block in either direction | Reject new messages, new conversations, follows, call invitations and acceptance. Existing message history remains readable by its participants; unblock and unfollow remain possible. An already-connected call is not forcibly ended. |
| Message permission: Nobody | Reject a new conversation. Existing conversations may continue unless blocked. |
| Message permission: People I follow | The recipient must follow the initiator. Following the recipient is not sufficient. |
| Follow permission: Nobody | Reject new followers; existing follows are not deleted. |
| Profile: members only | Signed-out requests cannot read this profile. Signed-in access remains. |
| Profile view history off | A visit is not inserted if either the viewer or viewed profile opted out, or either blocked the other. The existing VIP2+ visitor-list policy stays intact. |
| User / Host calls | Preserve User → Host only. New calls start as ringing; only the recipient accepts a ringing call. |
| Identity fields | Ordinary clients cannot change their role or reassign message/call participants. Server-authorized administration remains possible. |
| Chat UI | Host-to-User text chat can load a User target. Block/unblock is available in chat. Duplicate sends are locked while checking permission. |

Database policy checks remain authoritative even if a client bypasses the UI. Private helpers derive the actor from Auth; the public RPC returns only action booleans, not another user's settings/block rows. Cross-user preference lookup uses tightly scoped private helpers with an empty search path. Keep `mimo_private` outside exposed API schemas.

## Validation

47 automated checks pass: the earlier 36 Beauty/call checks; seven PostgreSQL policy subtests plus their parent; three UI checks. SQL is executed against isolated PGlite PostgreSQL with relevant columns and audited live baseline policies. This does not verify all production triggers/grants or real signed-in browser behavior. Current inline scripts pass syntax and whitespace checks.

The isolated SQL tests cover allowed and denied contact, forged identity, correct following direction, existing conversations, either-direction blocking, call acceptance, historical message access, anonymous profile visibility, profile-view consent, role escalation and participant reassignment. UI tests cover fail-closed permission feedback, idempotent blocking, safe names and unblocking when a profile is unavailable.

## Deployment order after approval

1. Apply the checked-in migration to Mimo project `zhhgiwqehwuwzxnqbnth`.
2. Verify its policies/functions/triggers and run production-compatible allow/deny checks in a rolled-back transaction with synthetic users; run security advisors.
3. Merge/publish the frontend PR and confirm deployed files match.
4. Two-account device check: block/unblock; message and follow permissions; User-to-Host calls; Host-to-User text chat; private profile signed-out visibility.

Rollback SQL is in `database/rollback-contact-permissions.sql`; it removes only this change's named policies, triggers and functions. Revert the frontend commit together with database rollback, because UI permission checks fail closed when the RPC is unavailable. No existing conversations/messages/follows are deleted by either direction.

## Existing audit items outside this migration

Read-only production security advisors also reported pre-existing public privileged helpers, mutable search path on `set_updated_at`, and disabled leaked-password protection. They are not described as resolved here:

- [Function search path remediation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Public privileged function remediation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Signed-in privileged function remediation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Password protection documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

Unread counts/read receipts, an inbox page, notification delivery, default call-settings enforcement and remaining product roadmap features are not part of this migration.
