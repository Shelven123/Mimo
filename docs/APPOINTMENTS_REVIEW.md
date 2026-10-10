# Appointment requests

Implemented: Profile → Meet opens an appointment request for that host; Me → My Appointments opens the participant list. Requests store a future ISO timestamp within 90 days and a note up to 500 characters. Device-local timezone is displayed. Users request Hosts, Hosts accept/reject, either participant cancels pending/accepted, and Host may complete an accepted appointment only after its scheduled time. Terminal states cannot reopen. Optimistic status matching prevents stale UI updates from falsely succeeding. Pagination, visible polling, login/retry and account-change cleanup are included.

Database authority: existing participant SELECT/RLS is preserved, restrictive INSERT checks actor roles and bilateral blocks, client INSERT is limited to request fields, UPDATE to status. Legacy client truncate/trigger grants removed. Trigger guards transitions. A partial unique index allows one accepted appointment per Host at an exact start timestamp. This is not a duration/overlap calendar or availability schedule. No charges, refunds, automatic calls or time reminders are included.

Appointment creation/status changes emit recipient notifications according to appointments preference; blocked contacts do not receive them. Notifications link to My Appointments. Repeated same-status updates do not duplicate notifications. History is retained, with no backfill.

Verified: 88 automatic checks across the existing project and new isolated PostgreSQL/DOM validation, role/ownership/time/slot/status/rollback and session cleanup cases; syntax/whitespace pass. Production migration applied; policies, private functions/triggers, unique index and field grants verified. Existing security advisor warnings unchanged; see NOTIFICATION_CENTER_REVIEW.md for remediation links.

Not Verified: production transactional authorization smoke, because the preceding notification smoke twice failed with MCP request-state errors; no successful production transaction is claimed. Physical-phone request/accept/reject/cancel/complete and notifications remain Not Verified. Existing accepted Beauty/call frontend unchanged. This migration filename was created without another CLI invocation after the earlier telemetry rejection; no rejected telemetry request was retried.

Phone acceptance: User opens Host → Meet and requests a time. Host opens Me → My Appointments and accepts/rejects. Check both accounts' lists/notifications, cancel, same-time conflict, and a later completion. Disabled appointment notifications must suppress new entries. Test sign-out/account switching. Payments require separate business rules and provider setup.

Rollback: revert frontend and apply database/rollback-appointments.sql. Rows remain. SQL restores inherited grants and their old risks; notify-center rollback is separate.
