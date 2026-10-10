# Contact permissions: deployment and validation

Status: **database deployed on 2026-10-10 UTC following explicit user approval**. All seven policies, three identity triggers and authenticated-only RPC grants were checked in production. Frontend release is tracked in PR #10. Real signed-in two-account device acceptance remains **Not Verified**.

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

47 automated checks pass: the earlier 36 Beauty/call checks; seven PostgreSQL policy subtests plus their parent; three UI checks. SQL is executed against isolated PGlite PostgreSQL with relevant columns and audited live baseline policies. These isolated tests do not establish real signed-in browser behavior. Production smoke checks additionally exercised the live schema and triggers. Current inline scripts pass syntax and whitespace checks.

The isolated SQL tests cover allowed and denied contact, forged identity, correct following direction, existing conversations, either-direction blocking, call acceptance, historical message access, anonymous profile visibility, profile-view consent, role escalation and participant reassignment. UI tests cover fail-closed permission feedback, idempotent blocking, safe names and unblocking when a profile is unavailable.

## Deployment and remaining acceptance

1. DONE: applied the checked-in migration to Mimo project `zhhgiwqehwuwzxnqbnth`.
2. DONE: production transaction with generated synthetic Auth users verified normal follow/chat/message/call, recipient acceptance, denied role elevation/caller acceptance, blocked message/call, readable history, existing chat after Nobody, rejected new chat/follow, correct Following direction, visit opt-out, anonymous profile visibility and RPC denial. All synthetic writes rolled back. Security advisors show the same pre-existing items listed below; no new public privileged helper warning.
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
