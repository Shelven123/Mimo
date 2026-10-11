# Support request notifications

Implemented: trusted administrator replies and actual ticket status transitions notify the requester. Self replies, requester messages, priority-only changes and matching reply retries do not produce notices. System Messages controls new delivery; absent settings default on. No backfill, email or push. The notification contains a generic preview and a validated ticket link; ticket detail remains protected by existing RLS.

Security: private-schema trigger function, empty search_path, execute revoked from PUBLIC/anon/authenticated. It requires auth.uid() and database-backed is_admin authorization. The definer privilege is needed only to insert recipient notifications that clients cannot forge. Existing notification ownership/read-state grants and support permissions remain unchanged.

Verified: 234 automated checks, including staff-only generation, retry suppression, disabled settings, safe destination and opening a ticket outside the first list page. Production trigger metadata and advisors checked separately at deployment. Real administrator-to-user phone workflow is Not Verified; no administrator identity has been provided. No production customer test messages were created.

Rollback: database/rollback-support-notifications.sql disables only these producers and preserves history. Revert frontend files separately if needed.
