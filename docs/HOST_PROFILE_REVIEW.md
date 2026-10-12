# Host preview, profile and reporting — 2026-10-12

## Requested experience

Home Host-photo activation now opens a bottom preview with real avatar/name/handle/presence, region/age, visible follower counts, bio and published photos. The large identity area links to the full profile. Preview has Follow, Chat, Video call and a Host-options menu. Background and focus are restored on dismissal; receiving a Home incoming call dismisses the optional preview and keeps call controls usable. Accepted Home layout and call.html/Beauty modules stay intact.

Full profile uses a large selected photo, thumbnail gallery, real identity/status/tags/info, About/Updates sections and a fixed action bar. Data comes from the Host profile, visible follow counts and latest six visible posts. Unavailable counts show a dash; no fabricated VIP levels, ratings, distances, private album or verification badges. Empty-avatar fallback is an initial. Share uses native share or clipboard. Existing call/appointment routes are used subject to their authorization checks. Replaced legacy profile file with clean HTML and removed its old Markdown fences/nonfunctional call placeholders.

Explicit ♥ 打招呼 sends exactly “你好，在干嘛呢？” and navigates to the returned conversation. Browsing never sends a message. Controller prevents double taps and retains the request UUID after a failed send. The greeting RPC is an empty-search-path invoker; it validates Auth actor, real Host and current contact rules, serializes greeting calls per pair, uses existing conversation/message RLS and message notification producers, and never overwrites an edited/recalled text on retry. The chat route additionally checks the requested conversation's two participants before loading it. Existing unrestricted chat creation does not share the greeting advisory lock, so this is not a new global conversation-uniqueness guarantee.

## Host report and admin entry

Host preview/full-profile ⋯ → Report host opens category/reason and up to three compressed screenshots. Stable request/payload IDs retain drafts on failures. Private evidence is bound to reporter/report paths and must exist before registration. Successful submission links directly to Report Center → Hosts. Host reports use the existing generic reports table; Plaza-post reports remain their separate channel. Administrator selects Hosts/Review queue to respond, with revision checks, terminal-response requirements and append-only review history. Reviews are not automatic sanctions or financial actions. admin_note is treated as reporter-visible response, not private staff notes; the old generic reports table had zero records when this feature was planned.

Support administrators now default to Customer support queue; own submission form is available by selecting My requests. User customer requests and replies continue through the existing support lifecycle. No actual recharge settlement is introduced.

## Database and authority

Managed migration 20261012092515 adds three authenticated-only invoker APIs and RLS-protected host_report_reviews. Host submission guard validates identity/Host/category/evidence, stamps the target-name snapshot and server times, and prevents forged status/response. Narrow column grants preserve identity and evidence immutability. Private, client-inexecutable audit definer is limited to appending authorized admin history atomically. Its empty search path/auth checks and raw-write denial are verified. A restrictive Storage DELETE policy additionally preserves bound Host evidence without preventing unrelated permitted file cleanup. Existing generic report account-deletion cascades are retained; do not promise report survival after deleting that account.

Production Verified (metadata): managed version, trigger enablement, RLS, denied anonymous execution/raw audit writes/status INSERT/identity UPDATE/DELETE, exact evidence-retention rule and no-UID empty reads. Existing reports_updated_at trigger stamps now(), compatible with the new guard. Security advisors unchanged. Only added performance finding is the unused audit-admin FK index; retained deliberately ([guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)). No customer greeting/report/file/review was created for testing.

## Verification and limits

Automated Verified: 296 regression checks, including 18 new PostgreSQL/DOM checks for greeting ownership/retry/block rules, Host report validation/private evidence/retention/admin authority/audit/rollback, safe identity rendering, preview focus/call protection, disabled actions/session cleanup, Host Report Center channel, exact chat participants, admin support defaults and signed-out browsing. Five inline scripts, three changed/new JS modules and diff checks pass.

User Verified: earlier Call/Beauty/Home/foreground notices remain accepted. None for this batch. Not Verified: actual iPhone visual/keyboard/gesture behavior, native sharing, real photo HTTP/compression/upload, live two-account greeting/report/review/call/appointment workflow or concurrent database sessions. DOM tests are not visual/browser acceptance. Public photos cover visible recent posts only; standalone gallery/profile-photo upload/editor, private albums, ranks/levels/ratings/distance and sanctions/appeals/cleanup quotas remain separate work. Actual payments remain disabled.

## Safe rollback

Revert these frontend assets/links and revoke the optional APIs/Host-report column writes with database/rollback-host-experience.sql. Preserve reports, review history, snapshots, evidence and all contact/storage guards. Do not drop existing report tables, remove working call producers or reset roles.
