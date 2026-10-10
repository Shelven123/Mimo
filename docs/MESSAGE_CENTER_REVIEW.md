# Message center and read receipts

Home already linked to messages.html, but that page was missing. The new page lists only the signed-in user's conversations, ordered by latest activity, with safe contact previews, unread counts, 30-row pagination and retry/login/empty states. Realtime events and 15-second visible-page polling refresh the list. Chat displays Sent/Seen and acknowledges only explicit IDs of loaded incoming messages while visible. Failed acknowledgements remain pending for retry. This is an open-chat acknowledgement, not eye-tracking or proof that every bubble was read.

## Permissions and deployment

- `mimo_inbox` is SECURITY INVOKER; existing conversation/message/profile RLS remains authoritative. Anonymous execution is revoked.
- `mimo_mark_read` is an invoker wrapper for a private, narrowly scoped helper. Auth determines the actor. Actual conversation participation is required. Only incoming IDs in that conversation change from unread to read; content and participant identities cannot be changed by this operation. Maximum 1,000 IDs per call.
- A dedicated insert policy and update trigger prevent authenticated senders from forging is_read. Trusted administration and existing legitimate content edits remain possible. No old message flags are reset.
- Existing contact blocking preserves history; reading/acknowledging history is still permitted when blocked. New message denial remains enforced.
- Frontend release follows database deployment and production allow/deny smoke checks. `database/rollback-message-center.sql` removes only this migration's functions, receipt guard and index, preserving stored read flags. Revert frontend together with rollback.

## Verification status

Implemented: inbox, badges, read acknowledgement and Sent/Seen UI. Verified: 60 automated checks including isolated PostgreSQL RLS cases, hidden-page/error/concurrent/disposal receipt cases, safe rendering, chat row deduplication/receipt updates and logout during a pending inbox response. On 2026-10-10 UTC the migration was applied to Mimo production; rolled-back synthetic-user smoke passed participant-only inbox reads, exact unread counts, recipient acknowledgement, repeat idempotence, sender/third-party/anonymous denial, preservation of late unread messages, blocked-history acknowledgement and legitimate content editing. All synthetic users/messages rolled back. Security advisors report the same pre-existing findings as the contact review, with no new public privileged function finding. Frontend release follows this verification. Real two-account phone acceptance remains Not Verified.

Not included: OS/browser push notifications, full notifications page, call preference enforcement, chat history pagination overhaul, new Beauty features or billing. Inbox offset pagination may shift while messages arrive; reload refreshes all loaded pages and deduplicates conversation IDs.

Pre-existing database security advisories remain documented in [contact permissions review](CONTACT_PERMISSIONS_REVIEW.md), including their remediation links. This change must not be represented as resolving those unrelated findings.
