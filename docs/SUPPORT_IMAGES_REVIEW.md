# Support images

Implemented: one optional screenshot/photo on new requests and replies. Text remains required. Existing Mimo image decoding/compression accepts JPEG, PNG, WebP and device-decodable HEIC/HEIF up to 20 MiB, strips original metadata by redrawing to JPEG, caps output at 1600px and 3 MiB. Private mimo-support-images bucket accepts JPEG only. Preview/removal and stable upload/request IDs preserve unchanged failed drafts; success and session cleanup revoke local previews. Existing text APIs remain compatible.

Authorization: image paths bind sender UUID, ticket UUID and message UUID. Invoker message guard locks the ticket, enforces requester/admin, open/in-progress state and existing uploaded exact path. New invoker APIs deny anonymous calls and changed retries. Storage SELECT permits uploader or an account that can SELECT the linked support message under existing owner/admin RLS. No client UPDATE/DELETE policy, preventing replacement and deletion races. Indexed attachment paths. Existing notifications do not include image URLs or contents.

Images render with validated private signed URLs for 300 seconds. Logout/ticket changes suppress stale signing and clear DOM. Signed links already copied or photos downloaded cannot be recalled; unexpired issued URLs remain usable until expiry. Image visibility does not mean client cannot save it. Refresh/polling renews visible links.

Automated Verified: 249 checks, including atomic failed image creation, requester/admin/outsider access, path spoofing, immutable files, unchanged/changed retries, closed-ticket enforcement, anonymous denial, rollback/history preservation, failed upload retry, actual form draft/success and logout during compression, stale signing and external URL rejection. JavaScript/inline syntax and diff checks passed. User Verified: none for this batch. Not Verified: actual Storage HTTP upload/sign/download, physical iPhone album/decode/visual workflow and production admin interaction.

Incomplete: multiple files, videos/documents, automatic orphan cleanup/retention, quotas/moderation. Failed or changed drafts may leave private orphan files; no unsafe client deletion was enabled. Owner has not designated an admin account; real queue handling still requires the registered email.

Rollback: database/rollback-support-images.sql disables image-writing APIs and uploads while preserving existing private image reads and history. Legacy text request/reply APIs continue.

CLI created the migration file before automatic approval rejected a PostHog telemetry request. No telemetry retry or bypass was attempted; implementation and deployment use local repository edits and Supabase MCP.

Production metadata verified: private 3 MiB JPEG bucket, Storage policies, invoker APIs, empty search paths and anonymous denial confirmed. Security advisors unchanged. Performance findings differ only by the new attachment-path index not yet used; retained deliberately for attachment lookup growth ([Supabase unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)). No customer records/files were created.
