# Notification center

Implemented: Home → Notifications, paginated own-user history, unread count, individual/loaded-row acknowledgement, refresh and visible-page polling, login/error/session-change cleanup, safe text and fixed internal destinations. Reading a notification is separate from chat Seen. Historical call entries link to the caller profile and never auto-answer.

New message, ringing-call and follow inserts generate one recipient notice in a private trigger function. Recipient preferences suppress only future events; missing preferences use true defaults. Bilateral blocks suppress generation. No historical replay, browser push, appointment/activity producer or official-message publishing UI is included. Those remain Incomplete.

Clients can update only is_read; own-user RLS is retained. Notifications' legacy client TRUNCATE/REFERENCES/TRIGGER grants are revoked. The private definer function has empty search_path and no anonymous/authenticated EXECUTE grants. Existing call media, Beauty and signaling frontend files are unchanged. The producer runs in the source insert transaction, so a database notification error would fail that insert; source schema and isolated trigger integration are checked, but production transaction smoke has the limitation below.

Verified: 76 automated checks including isolated PostgreSQL producer/settings/ownership/forgery/rollback and DOM cleanup, batching and safe rendering. Production migration applied; metadata verifies all three triggers, safe function configuration, forbidden public execution/content updates/truncate, and allowed read-state update. Syntax/whitespace pass.

Not Verified: production synthetic-user transaction smoke. Two attempts returned MCP Invalid or expired requestState; neither yielded a successful execution result. Phone notifications, two-account delivery, runtime latency and new read defaults still need device acceptance. Do not label these User Verified. SQL smoke is retained in database/test-notification-center.sql for reproduction.

Advisors: no new warning after migration. Existing warnings remain: [mutable search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [anonymous definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). These inherited warnings are not claimed fixed.

Rollback: revert frontend and apply database/rollback-notification-center.sql; generated history is retained. The SQL restores inherited grants and therefore restores their old risks as well.
