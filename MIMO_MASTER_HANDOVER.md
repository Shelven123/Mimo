# Mimo Master Handover

Current Beauty checkpoint: v2.7.2, with standalone preview and Video Call integration USER VERIFIED in the later acceptance checkpoint below. Latest product work: polished Plaza/private messaging and local media uploads with explicit Reel confirmation and upload management, following Help & Support and wallet/recharge foundations; real payments remain disabled. Inherited checkpoint: v2.6. This document is the canonical handover for ChatGPT Work; dated continuations supersede historical status statements.

## Rules
Inspect current repository code before editing. Preserve working features. Do not equate implemented with user-verified. Prefer small reversible changes. The owner prefers direct execution with few unnecessary questions.

Critical: voice and video calls currently work. Do not casually rewrite call.html. Keep Beauty isolated from call.html until the Beauty preview is stable and accepted.

## Project
Mimo is a social host platform inspired by Trimo, using static HTML/CSS/JS on GitHub Pages and Supabase for backend/auth/data. Old LoveDemo is obsolete.

Product rules:
- Only User initiates voice/video calls to Host.
- Host can accept calls and initiate text chat, but cannot initiate voice/video.
- Only Host creates Plaza posts; User/Host can browse, like, comment, follow.
- Who Viewed Me requires VIP2+.

## Database
Phase 1: profiles, wallets, vip_levels, user_vip, follows, posts, post_likes, post_comments, profile_views.
Phase 2: conversations, conversation_members, messages, calls, call_signals, appointments, notifications.
Phase 3: wallet_transactions, recharges, gifts, gift_transactions, host_earnings, withdrawals, shop_products, shop_purchases, inventory, daily_checkins, tasks, task_progress, referrals, ranking_snapshots.
Phase 4: impressions, interest_requests, support_tickets, support_messages, official_messages, reports, admin_audit_logs, is_admin helper.
Settings: privacy_settings, blocked_users, notification_settings, call_settings, beauty_settings.
RLS is enabled. Do not globally disable it as a shortcut.

## Frontend status
Important files: index.html, profile.html, chat.html, login.html, me.html, call.html, settings.html, account-profile.html, privacy-safety.html, blocked-users.html, notification-settings.html, call-settings.html, beauty-settings.html, beauty-preview.html, beauty-engine.js, .nojekyll.

Implemented foundations include host discovery/search/cards, profile flow, real DB Follow, real DB Chat, call navigation, Account/Profile save, Privacy/Safety preferences, notification preferences, call preferences and unified Beauty settings/live camera.
Some settings persist but are not yet fully enforced at runtime: privacy/blocking, notification delivery and call preferences.

## Calls: protect this working core
Voice Call works. Video Call works according to user testing, including User-to-Host outgoing, incoming modal, accept, audio, iPhone camera flip, fixed local preview and local/remote PiP swap.

Important call commits:
- 6f0e9f4f89d5b3758f2e80a23a4cef5157061f4b first-call black preview fix
- 9473b42722cda17cf9dc8820b4ae0fc15faee935 local/remote PiP swap
- eb2a89c50fbeb639af8866f4b31781f51470953f overlay tap interception fix
- 5f1d24c94c0c343ebf7cb940403b239086e21b9f persistent remote MediaStream for Safari
- fe841382bc6c6bd82a3a2e2801e75a09712da41c wait for Realtime subscription
- 5a660039ce21dbcbf6f0c59443eab4e06906ff19 guard signals before peerConnection

A setupRealtime/createPeerConnection reorder was attempted but NOT applied. RTC currently uses STUN without TURN. Only add TURN if real network testing demonstrates a need.

## Beauty history
The user rejected the old separate Settings-to-Preview UX. Unified live Beauty page is preferred.
Key commits: e4b1f6118859d97af4331d3b32143a5347ae3653, e8ea9e614952651c2397f4838826e543fd18f60f, f3b68c2349eeff8250faeb094d29010b3194b0b9, 479bf8d691c8fe8fee059b182fc71152ddeea4a6.

Mirror/camera direction is now accepted by the user. Do not change it unless a new issue is reported. Relevant commits: 2a0edfa534b75bc4682922a4cd88a7d7dcd5b60a and 84782c8ba1519cee76ede87f39c356f0abc98071.

Early fixed-screen face/eye geometry caused oval/black contours and rectangular eye artifacts. It was removed in a58db789d118d9e458ed13b868ec145bb7113b35. Never reintroduce fixed screen-coordinate warps.

## MediaPipe tracking
Initial work: 4df7c4de17e83eab7497e09180c93fa2489353f9, 2e37a3e754f3af23bc06b262f06891b6b3a2e61.
A literal escaped-newline syntax corruption was fixed by 058436f63c36a960679e0a17a996e9b52f91d7a8; cache bust b2fad554fe61a3f57ba3cb2faf4951f80553e86a.
Diagnostics: 1d06334d383ee9b1068644497047aa8f4c3a1a46 and b6214d20cff7eade879ef81dc33c9e995823a378.
The iPhone model loader was repaired in b1ba7f1fdcfc70476839f392489fd561405bc8f4 and 6556d5fda801c6740773ec7f01e4d1b941ffde00.

User verified on iPhone Safari: Face detected, 478 landmarks. Do not re-debug the loader unless it regresses.

Old radial Slim Face distorted/enlarged the lower face. Relevant failed/obsolete attempts include 2d8109f6da3c42b20cb845f8c0db9d57e4b3d300, 92059a07435726502a04d85486c215c65b8868dd, 0889a18c121852891961ec0cf34a2a8f434710b2 and 4d0b8b7b727aa9ace810d8cbd3edeeede028f9cf. Do not return to crude whole-face radial compression.

## Beauty Engine V2 timeline
V2: ce7f8573109ba936e822f1a3ac915459e4840129 contour-aware face/eye/chin/nose reshape; 0a6d7931a33f95f70c8e6a37ff1bf32138836f55 UI.
V2.1: 64b1f7a552dfa586cd745f3b8c360addb68e40a4 eye brightening/dark-circle correction; f556f486594f8561c21b3582aeb2a804d2fd2517 UI.
V2.2: c4082587735543f67b2169757dab52cc1548de33 landmark-following natural makeup; 849b0047f07c6b77c8531363b7a7540065cb69b2 UI.
V2.3: deaa2ff9d1b04fda89749873b3ae20c535139f93 protected-detail smoothing; 6f4be22dc50d5e83d4813246d180b1d53a12ca35 UI.
V2.4: 84b1055f647a1679012409970ee44d1e62e5ad6b portrait/background segmentation blur; 1569f3dab4ca319da777c1afa395cc77ada0d462 UI.
V2.5: b2cd33536419c19e41c0000edc7a140bb74dd183 landmark stabilization/performance allocation improvement; ccceac8d61bf89a9616aa29680425078ac58448c UI.
V2.6: ec7119ec881b35469c4e073ba0bd6c5f1f650134 adaptive iPhone processing width/performance; 6ac7788ade61d355874b0a4a2f6602b3b41015dc UI.

## Inherited verification matrix (historical; see later acceptance checkpoints)
User-verified:
- unified live Beauty camera
- camera/mirror direction acceptable
- Face Landmarker loads on iPhone Safari
- 478 landmarks detected
- Smoothing worked in earlier/basic implementation
- Whitening works
- Rosy Tone works

Implemented but NOT yet final user-accepted:
Slim Face, Big Eyes, Chin, Nose, Eye Brightening, Dark Circle, Makeup, Background Blur, newer protected-detail smoothing, landmark stabilization and adaptive performance.

Do not call the second group verified.

## Beauty technical caveats
Current engine remains CPU Canvas based, not a production GPU beauty SDK. Validate eye strength, chin inverse-map direction, nose behavior, regional eye masks, ImageSegmenter model/mask/orientation/edge quality and iPhone performance. Full-frame pixel loops may be expensive.
Professional direction: MediaPipe 478 landmarks -> stable local mesh warp -> WebGL/GPU -> skin-preserving shader -> makeup masks -> portrait segmentation -> MediaStream.
Do not promise exact proprietary Douyin quality.

beauty-engine.js outputs canvas.captureStream, but DO NOT integrate Beauty into call.html until preview behavior is stable and user-approved. Later preserve signaling, remote stream, camera flip and PiP, and replace only the outgoing local video layer with a safe raw-camera fallback.

## Remaining roadmap
Database foundations do not mean end-to-end features are complete. Remaining work includes auth/role polish, full permission enforcement, Plaza production/moderation, unread messaging, appointments, diamonds/recharge payment flow, gifts, host earnings/withdrawals, VIP 1-10, VIP2+ Who Viewed Me enforcement, rankings, official/system messages, support UI, drift bottle, diamond fishing mini-game, referrals, backpack/inventory, profile impressions, check-ins/new-user tasks, shop flow, notification delivery, privacy/block enforcement, call-setting enforcement, admin/moderation, production security/RLS review, and TURN only if network testing proves necessary.

## Inherited next steps (historical; see dated continuations)
1. Inspect current beauty-engine.js and beauty-settings.html.
2. Sanity-review V2.6, especially ImageSegmenter lifecycle/mask semantics and iPhone Safari performance.
3. Preserve Face Landmarker and camera/mirror behavior.
4. Make only necessary fixes.
5. Request ONE consolidated real-device Beauty test, not repeated tiny tests.
6. Record accepted V2 effects.
7. Only after Beauty is stable, integrate it into outgoing Video Call safely.
8. Update this handover after major milestones.

## Engineering behavior
Inspect before edit. Never claim failed operations succeeded. Never call something verified without evidence. Diagnose visual failures before patching. Cache-bust engine imports after updates. Avoid broad rewrites of working files. Keep commits focused. Mobile Safari/iPhone is a first-class target.

Mimo is not a zero-stage demo. Continue from current repository state; do not restart it.

## Work handover continuation — v2.6.1 preview fixes (2026-10-10 Malaysia)

The inherited handover was read in full before changes. Repository base: de207a0d0a5ec6db6075a548dbf4f92cf91aebe4. No call.html, signaling, mirror direction, database or RLS changes.

Implemented:
- Fix Big Eyes incorrectly treating zero-displacement cheek/chin/nose zones as eye magnification zones. Eye-only settings now affect eye zones only.
- Use the official pinned SelfieSegmenter .tflite model, category 1 for person, and compose blurred background beneath masked processed foreground. Previously the full original frame covered the blur.
- Load the optional segmenter on demand; close segmentation results in finally, reuse canvas sizes, and skip duplicate video frames.
- Preserve processed pixels when restoring detail after smoothing, rather than restoring raw camera pixels that undo reshape/correction/makeup.
- Clear landmark stabilization after losing the face and use monotonic inference timestamps.
- Add explicit engine disposal, including late asynchronous model creation, and use it when switching cameras/leaving the page.
- Update makeup immediately; restore camera retry controls after a failed flip; separate tracking diagnostics from save/error messages; cache-bust the unified page import.

Verified locally (NOT real-device verification): five regression tests use real Canvas pixels with fake MediaPipe outputs: eye-only jaw isolation, foreground/background blur composition and mask disposal, preservation of processed eye detail under smoothing, optional-model/duplicate-frame behavior, and cleanup of a model completing after disposal. JavaScript syntax and git diff checks also pass. See tests/README.md.

Not Verified: actual model loading after these changes, iPhone Safari Canvas filters, hair/body mask edges and orientation, sustained iPhone performance, camera retry/flip behavior, and all v2 effects in the original unaccepted group. Older user-confirmed effects remain historical confirmations; they are not new v2.6.1 acceptance.

Incomplete: GPU/mesh beauty pipeline, skin-only smoothing, full beauty acceptance, and Video Call integration. The inherited Roadmap remains in force.

Repository discrepancies found, deferred from Beauty scope:
- profile.html callHost/videoCallHost still display placeholder alerts, whereas index.html links to working call.html.
- Database phases/RLS are documented but SQL migrations are not present in this repository; live database verification was not performed.
- Legacy beauty-preview.html retains stale explanatory text and an unversioned import. The supported user flow remains the unified beauty-settings.html page.

Next: one consolidated real iPhone Safari test using the checklist in tests/README.md. Record effects as Verified only after explicit acceptance. Keep Beauty isolated from Video Call until accepted.

## Work continuation — v2.7 independent preview (2026-10-10 Malaysia)

The owner authorized continued execution and publication without repeated small-step approvals. Scope remains the Beauty priority; no call.html, database, RLS or accepted mirror-direction changes. The owner's general acknowledgement is not a per-effect or sustained-performance acceptance record.

Implemented:
- Landmark-attached local inverse mapping now uses face roll axes for jaw, eyes, chin and nose. Eye strength is linear in the slider, combined displacement is bounded, and sampling/iteration is limited to affected regions with a safe margin.
- Face-contour smoothing with feathered eye/brow/nose/lip exclusions and an edge-sensitive blend of processed pixels. Background and mouth/eyes are protected. This is a geometric face mask, not a semantic skin classifier or production bilateral GPU shader.
- Native Canvas blur is tested with actual pixels. A no-op or unavailable filter selects a bounded, separable CPU fallback with premultiplied alpha and reusable buffers per destination. Background blur runs last so smoothing cannot soften the entire scene or overwrite it.
- Regional eye correction and blush follow face roll; lip tint excludes the open-mouth interior.
- Rendering honors the requested preview frame-rate ceiling and avoids reprocessing unchanged video frames; settings changes still redraw paused frames. Tracking resets on large jumps and adapts smoothing to motion.
- Effect exceptions restore the raw independent preview and display a diagnostic. Invalid/empty landmark or segmentation results are cleared.
- Press/hold original comparison (pointer and keyboard) does not persist a temporary disabled state. Unified camera capture requests 640 px / 24 fps where the device supports those preferences.
- Legacy beauty-preview.html redirects to the unified Beauty page, avoiding obsolete text and a stale unversioned import.
- Exact test dependencies are locked; a read-only GitHub Actions regression workflow runs relevant pull requests and main pushes.

Verified locally: 11 real-Canvas regression tests with mocked MediaPipe outputs, plus 3 JSDOM interaction tests with mocked camera/auth/engine (14 total). These include native/no-op-filter fallback, protected cheek smoothing, local work bounds, rotated chin direction, lip interior protection, frame-rate/paused-video settings, comparison persistence, immediate Makeup, save-status preservation and camera failure/retry/disposal. Changed JavaScript syntax and whitespace checks pass.

Not Verified: real MediaPipe inference in this build, actual iPhone Safari visuals/thermal behavior, all new effect strengths/face-mask edges, camera constraints across devices, semantic skin quality, and full acceptance of the inherited unaccepted effects. A Chromium installation was attempted but the browser archive download failed; JSDOM testing is NOT browser automation. Do not call this a real Safari or browser-visual acceptance.

Incomplete: production GPU/mesh pipeline, real-device Beauty acceptance and outgoing Video Call integration. Other Mimo product Roadmap features remain pending; this Beauty release does not complete the entire platform.

Next: handle concrete visual/device feedback, record explicitly accepted effects, and only integrate Beauty into Video Call after stability is established. Continue preserving the working call core and all inherited prohibitions.

## v2.7 layout correction — fixed live preview (2026-10-10 Malaysia)

User recording confirmed that document scrolling hid the camera when lower sliders were reached. Beauty now uses a viewport-height flex layout: header and a compact camera stay above a separately scrolling settings panel, with dynamic viewport and safe-area sizing. Engine, mirror direction, camera stream and calls are unchanged. Actual iPhone layout acceptance remains pending; this is an implemented CSS fix, not a device-verified claim.

The same review found that the comparison button shared the preset class and was incorrectly bound as a preset. Preset handlers now target only elements with data-preset. A real click after comparison release is regression-tested and preserves the selected preset. Local tests now total 15 (11 engine + 4 DOM); syntax/whitespace checks pass.

## v2.7 preview sizing follow-up (2026-10-10 Malaysia)

User screenshot showed a large black area above a clipped face after the fixed-layout change. The preview still inherited Grid sizing and cover cropping. The camera container now explicitly uses relative positioning/flex centering; its canvas is absolutely constrained to the container and uses contain/center to display the entire source frame. The independent settings scroll remains. Engine processing and mirror transform are unchanged. Source checks and regression tests are distinct from real iPhone layout acceptance, which remains pending.

## 2026-10-10 Beauty v2.7.1 — maximum-strength correction
User reported all controls except Smoothing/Whitening/Rosy looking strange at 100. These three accepted controls remain unchanged. Fixed additive overlapping jaw warps by normalized blending; shortened Chin via corrected inverse-sampling direction; reduced maximum eye enlargement, nose displacement and regional lift. Combined displacement capped at 3% face width. Background blur radius reduced and mask refresh interval shortened (performance on phone NOT VERIFIED). No new redesign or call integration. Preview uses absolutely bounded object-fit:cover to remove sidebars; intentionally crops top/bottom while retaining fixed preview and independent control scrolling.
Implemented: these corrections. Verified: 16 automated pixel/DOM checks, including combined maximum displacement and rotated chin direction. NOT VERIFIED: live iPhone facial appearance, motion stability, segmentation edges, mobile performance, and all previously unaccepted effects. User has reported the prior v2.7 maximum-strength appearance as unacceptable; do not describe it as accepted.

## 2026-10-10 Beauty v2.7.2 — pose and expression stability
User accepted the v2.7.1 preview layout and then reported current effects have no problem. Record this as general user acceptance of the current appearance, not proof of an exhaustive device matrix or prolonged motion test. New filters/makeup expansion/effects are explicitly deferred.
Implemented: detect substantial face scale/roll changes even when nose is stationary, reset smoothed contour for a new pose, follow substantial per-landmark expression changes immediately. Existing effect strengths, layout and call.html unchanged.
Verified locally: 19 mocked-model Canvas/DOM checks. New tests compare moved-frame output to a freshly detected pose for scale/roll and open mouth; test face loss/reacquisition. Not Verified: actual v2.7.2 iPhone motion/thermal behavior, segmentation hair-edge quality, prolonged camera use. Beauty-to-Video-Call integration remains Incomplete and deferred until motion acceptance.

## 2026-10-10 Video Call Beauty integration — first implementation
User explicitly confirmed v2.7.2 standalone stability has no problem and then authorized integration. This is user acceptance of preview stability; it is NOT acceptance of the new two-party call path.
Implemented: video calls asynchronously read the signed-in user's saved beauty_settings. Calls begin on raw video without waiting for model/settings loading. New beauty-call.js owns only its source video and Canvas output. Original localStream retains the microphone and camera; replaceTrack switches only the video sender. Local PiP shows the same processed output while keeping existing mirror/layout handling. Call-only Beauty toggle does not persist settings. Camera-off disables raw and processed tracks; camera flip releases processing, preserves the existing Safari camera reopen/recovery, then rebuilds Beauty for the new camera. Hangup invalidates pending initialization and disposes processing. Voice calls never initialize/query Beauty.
Fallback: unsupported source/capture, failed video replacement, unavailable face model, processing errors, ended captured track or stalled renderer return to the raw camera. If RTC rejects raw restoration, keep the current output live and expose retry instead of stopping the only active sender. Rendering watchdog pauses while document is hidden or camera disabled. Video controls use three columns to fit the added control; voice controls unchanged.
Verified locally: 31 total mocked-model Canvas/JSDOM tests, including 12 new call adapter/lifecycle tests. New paths cover shared original audio, camera-off, video replacement, flip, startup failure, delayed initialization during hangup/off, runtime fallback, rejection/retry, disposal and voice isolation. Syntax/whitespace checks passed. NOT VERIFIED: actual two-party iPhone/Safari video-call Beauty, remote output appearance, PiP/flip with captured stream, thermal/network behavior, browser-background capture, or RTC codec compatibility. No signaling/database/RLS modifications. Engine remains v2.7.2, with render timestamp diagnostic for call watchdog.
Next real-device acceptance: save Beauty values, make a video call; confirm both local and remote Beauty; toggle Beauty and Camera separately; flip front/back; swap PiP; confirm audio/mute; hang up and redial; run 3 minutes. Voice call smoke check also required. Filters/effects expansion remains deferred.

## 2026-10-10 Video-call effects reported ineffective — NOT accepted
User clarified the problem is VIDEO CALL: only Smoothing/Whitening/Rosy are reported working; Slim Face is indistinguishable from normal and all other controls are reported ineffective. Video-call Beauty is NOT accepted. This does not independently retest the previously accepted standalone preview. The cause is not established from source alone; do not claim algorithm strength, missing saved values or face tracking failure as a confirmed cause.
Implemented: an Adjust panel in calls exposes actual loaded values and immediately updates the active processing engine. Changes made while loading are reapplied before output selection, preventing startup from applying a stale snapshot. Panel shows whether the sender actually uses processed or original video, face detection status and fallback reason. Beauty On label no longer implies face-dependent controls are active without tracking. Failed settings reads retain raw video and expose adjustment instead of silently hiding the control.
Verified: 33 automated Canvas/DOM tests including active engine update without track replacement and parameter changes during startup. Not Verified: reported video-call reshape issue resolved, actual iPhone tracking in the call source, remote appearance. Call Beauty remains Not Accepted pending on-device results. Engine deformation strength unchanged in this diagnostic revision.

## 2026-10-10 Recording review — cold-start on each Beauty toggle
Reviewed user's 7.765s video locally. Extracted frames show Beauty On followed by Beauty loading face; the Adjust panel/strengths are not visible in this recording. This establishes the visible loading state, not the cause of absent reshape or remote acceptance. Source confirmed each off disposed the engine and each on reloaded FaceLandmarker.
Implemented: retain the call's initialized pipeline/model across off/on; off sends the ORIGINAL camera and disables effects in cached output. Flip, hangup and processing failure still dispose. Handle rapid off during cached track replacement without disposing the retained engine. Beauty circle now opens adjustments; explicit Beauty On checkbox in the panel handles off/on. This avoids mistaking repeated cold starts for comparison and makes current strengths accessible.
Verified locally: 36 automated checks, including model reuse and rapid toggle cancellation. Not Verified: phone detection startup time, actual Slim Face correction, other reported ineffective call effects, remote appearance. Call Beauty remains Not Accepted. No deformation-strength changes.

## 2026-10-10 Beauty accepted; contact permissions prepared, NOT deployed
User confirmed Video Call reshape appeared, then all Beauty effects, then remote appearance, camera flip, PiP, audio and sustained call behavior all work. Record this as USER VERIFIED acceptance of the current v2.7.2 call integration and preview; not an independently recorded multi-device test. The earlier Not Accepted call checkpoints are historical and superseded by this feedback.
Next-stage live audit confirmed settings/block tables exist but their policies did not enforce contact preferences; profile roles and message/call participants could be changed by ordinary clients. Contact-permissions RPC, restrictive policies, identity guards and frontend feedback/blocking have been implemented in a separate review branch. Host-to-User chat targeting corrected. Existing User→Host call rule and accepted media/Beauty paths preserved.
Verified: 47 automated tests, including isolated PostgreSQL RLS allow/deny and UI tests. The production migration attempt was REJECTED by automatic approval review (specific access-control scope requires confirmation). Read-only check confirmed zero new policies and no new RPC on production. Do not merge or deploy frontend permission gates before database approval/application. No production schema or records changed. See docs/CONTACT_PERMISSIONS_REVIEW.md and rollback SQL for concrete scope and deployment order.
Incomplete: production policy deployment/verification, two-account device acceptance, unread/read receipts, inbox, notification delivery, call defaults enforcement and other remaining roadmap.

## 2026-10-10 Contact permissions — database deployed after approval
User explicitly approved continuation after reviewing PR #10 and the concrete contact policy scope. The earlier automatic rejection is historical: migration now applied successfully to production. Verified actual presence of seven restrictive policies, three identity triggers, authenticated RPC execution and anonymous RPC denial. A transaction with generated synthetic Auth users passed live normal-contact, block, message/follow preferences, role protection, recipient-only acceptance, profile visibility and visit-consent checks; all synthetic writes rolled back. Existing production security advisor items remain unchanged and documented with remediation links.
Implemented: UI gates/blocking and database controls in PR #10. Verified: 47 automated checks plus production SQL smoke. User Verified: prior Beauty v2.7.2 preview/call acceptance remains intact. Not Verified: new contact flows on two signed-in physical devices. Frontend publication is tracked in PR #10; verify Pages bytes after merge. Remaining inbox/unread/notifications/call-default roadmap is still incomplete.

## 2026-10-10 Missing Block button — confirmed layout defect
Reviewed the user's 08:27 recording: the user correctly opened Test Host's profile and chat with existing messages. Live Pages HTML already contained the button. It was outside the fixed 64px header and hidden underneath that header; the earlier cache/incorrect-entry diagnosis was not supported and is superseded. The separate bare chat URL previously suggested lacked the required host parameter, explaining that screenshot's Host not found message, not the original missing-button report.
Implemented: place Block/Unblock inside the fixed header at the right, keep it visible while messages scroll, constrain long contact names, remove accidental Markdown fences from chat HTML. Accept host/id/user target parameters and provide an accurate choose-contact message for a bare URL. No guessing or automatic selection of a recipient. Permissions and accepted Beauty/call media behavior unchanged. Syntax and DOM ownership verified; actual updated iPhone appearance and two-account block behavior still Not Verified. Publish via the chat-entry fix PR and check live HTML bytes after merge.

## 2026-10-10 Messages / read receipts — next implementation
PR #11 merged and Pages chat HTML matched the release exactly. User's 15:25 phone screenshot shows the visible Block control and successful Contact blocked response: USER VERIFIED entry and own block operation. This does not establish a two-account denied send/call or unblock test.
Implemented: messages.html fills the existing Home → Messages link with the signed-in user's conversations, latest preview, unread badge, activity ordering, pagination, retry/login/empty feedback. Realtime plus visible-page polling refresh summaries; no notification push is included. Safe text/URL rendering and session-change cleanup prevent stale private results after logout.
Implemented: chat shows Sent/Seen; incoming loaded messages are acknowledged only while the page is visible, in explicit ID batches. Failed acknowledgements retry; updates arriving after a batch snapshot stay unread. Sender-side polling backs up receipt updates; message rows deduplicate. This acknowledges messages loaded in an open visible chat, not proof that every bubble was physically read. Existing chat history retrieval limit/pagination remains unchanged.
Database: invoker inbox RPC respects existing RLS; recipient-only acknowledgement uses a scoped private helper that checks Auth and actual conversation participation and changes only is_read for supplied incoming IDs. Sender receipt forgery is blocked on insert/update; original content edits, history and contact permissions remain. No migrations change call signaling or Beauty. Migration and independent rollback SQL checked in. Production deployment and real-device message-center/receipt acceptance remain pending until explicitly recorded below.

### Message-center database verification
Migration deployed to Mimo production on 2026-10-10 UTC. Real PostgreSQL allow/deny smoke passed participant-only inbox, exact incoming unread counts, recipient acknowledgement, repeat acknowledgements, sender receipt forgery rejection, late-message unread preservation, reading blocked history, legitimate content edits, third-party and anonymous denial. All synthetic Auth users/messages were transactionally rolled back. 60 automated checks pass. Advisors retain the already-documented pre-existing warnings, with no new public privileged helper warning. Frontend release is the message-center PR following this database verification; phone inbox, live Sent/Seen and two-account contact restrictions remain Not Verified. See docs/MESSAGE_CENTER_REVIEW.md for scope and rollback.

## 2026-10-10 Call default preferences
PR #12 message center was merged and its three live frontend files matched the release. Phone inbox/receipts remain Not Verified.
Implemented: starting or answering calls reads the signed-in user's microphone, camera and incoming sound defaults before acquiring media or sending/accepting an invitation. Explicit false is preserved; an absent row uses the database's true defaults. Failed/invalid/timed-out reads stop startup instead of silently enabling devices. Settings cannot be saved until a successful load; retry is available. In-call controls override only that call. Camera flip and recovery preserve the camera-off state; saved Beauty waits until the camera is enabled. Sound controls playback mute, not physical speaker/earpiece routing.
Corrected misleading settings copy: the accepted front preview is mirrored, rear preview normal. No preview orientation, signaling, Beauty algorithm or database schema changes.
Verified: 68 automated checks with mocked media/RTC/DOM plus syntax and whitespace checks. Production metadata confirms call_settings RLS enabled with own-user SELECT/INSERT/UPDATE policies; this release does not claim a new production transactional authorization smoke.
User Verified: previously accepted Beauty v2.7.2 and call behavior remain the baseline. Not Verified: new defaults on physical phones, both participants' disabled-media appearance/audio, switching cameras while disabled and Beauty reactivation on actual Safari. See docs/CALL_PREFERENCES_REVIEW.md. Notification delivery, appointments and monetization roadmap remain Incomplete.

## 2026-10-10 In-app notification center
Call-default PR #13 merged; post-merge CI/Pages passed and all three live frontend files matched. New call-default phone acceptance remains Not Verified.
Implemented: notification center, pagination, unread count, explicit individual/loaded-ID read actions, visible polling, safe internal links and session cleanup. Message/ringing call/follow database inserts generate recipient-only notifications according to notification_settings; missing settings default true, explicit false suppresses new events, historical rows remain. Blocks suppress delivery. Call history links to profiles without auto-answer. Notification read and chat Seen are independent. Settings load errors disable saving and offer retry.
Verified: 76 isolated PostgreSQL/DOM/media checks; migration applied to production, trigger/function/grant metadata verified, no new advisor warning. A production transactional smoke was attempted twice but MCP returned Invalid or expired requestState; it remains Not Verified, not passed. Phone delivery/read and two-account acceptance remain Not Verified. Stored records were not backfilled. See docs/NOTIFICATION_CENTER_REVIEW.md and the checked-in reproducible SQL smoke.
Incomplete: browser push, appointments/activity notification producers, official publishing UI, appointments flow and monetization. Existing accepted call/Beauty frontend unchanged. CLI generated the migration file before its telemetry request was automatically rejected; subsequent work used repository edits and Supabase MCP, not telemetry retries.

## 2026-10-10 Appointment request lifecycle
Notification PR #14 merged; CI/Pages succeeded and its three live frontend files matched. Notification production transaction smoke/phone acceptance remain Not Verified.
Implemented: Host profile Meet → request with future time/note; Me → My Appointments participant list. User→Host only, pending creation, Host accept/reject, either participant cancel, Host complete after the accepted appointment time. Terminal states cannot reopen; identity/fields protected, stale UI updates detected, one accepted exact start time per Host enforced by partial unique index. Device timezone displayed; no duration calendar, scheduled auto-call or payment implied. Settings-driven appointment notifications added; blocks suppress generation. Paging, visible polling and session cleanup included.
Verified: 88 automated isolated PostgreSQL/DOM/media checks and syntax/whitespace; production migration and policy/trigger/index/grant metadata verified. No new advisor warning. Not Verified: production transactional smoke and two-account physical-device booking/notification acceptance. Existing call/Beauty frontend not modified. See docs/APPOINTMENTS_REVIEW.md for scope, status, device checklist and rollback.
Incomplete: payments/recharge, gifts/earnings, availability/duration calendars, reminders, browser push, activity/official producers and remaining inherited Roadmap. Never claim request acceptance charged a customer or started a call.

## 2026-10-10 Wallet read checkpoint
Appointment PR #15 merged; CI/Pages passed, seven live frontend files matched the release. Phone appointment/notification acceptance remains Not Verified.
Implemented: Me → Wallet with exact diamond balance, paginated own-user ledger, safe text rendering, login/error/account-change cleanup. Me balance now uses exact SQL text amounts; failed/missing reads show Unavailable instead of a misleading zero. Recharge links to a clearly read-only wallet until payment setup exists. Removed inherited outer Markdown fences from Me HTML.
Verified: 96 automated checks and syntax/whitespace, production migration/RLS/invoker/grant metadata, real no-Auth-context read returning zero rows. No balance/ledger/order mutations made. Advisors unchanged. Not Verified: signed-in physical-phone wallet/history and production transactional cross-user acceptance. No claim of payment, gifts or payout completion.
Next required owner inputs: merchant/provider configuration, approved MYR-to-diamond packages and Host/platform split/payout rules. Actual Edge Functions list is empty; no checkout/webhook configured in repository. See docs/PAYMENT_READINESS.md for the concrete remaining payment requirements. Other inherited Roadmap features remain Incomplete.

## 2026-10-10 Recharge foundation — disabled purchase checkpoint
Wallet PR #16 merged and CI/Pages succeeded; three live frontend files matched. User's subsequent generic confirm/continue authorizes further development, not specific prices/merchant/split values.
Implemented: Recharge information/history page, server-owned package catalog, Auth-derived idempotent pending orders and exact monetary snapshots. Raw client INSERT into recharges is denied: inherited own-user INSERT allowed forged paid statuses. Service-only private atomic accounting verifies order/provider/amount/currency, unique receipt, locks wallet/order and commits credit/ledger/paid state together. Duplicate matching callback is a no-op. Purchase UI is disabled, no prices seeded and zero active production packages. No real financial rows changed by deployment.
Verified: 107 isolated PostgreSQL/DOM/media tests; syntax/whitespace, production migration/grant/RLS metadata and no-UID history/zero active-package checks. Receipt store has explicit restrictive deny-all client RLS, privileged helpers private and public wrappers invoker. See docs/RECHARGE_FOUNDATION_REVIEW.md and rollback SQL.
Not Verified/Incomplete: production transactional settlement, real provider checkout/signature validation, production callback concurrency, refunds/reconciliation, physical-phone recharge acceptance, merchant setup, approved prices, Host split and payout rules. Accounting assumes a trusted external backend verified payment; NO such backend is deployed. Never claim real payment is functional or enable checkout merely because packages exist. Existing Beauty/call frontend unchanged.

## 2026-10-10 Help & Support checkpoint
Recharge PR #17 merged; PR/main CI and Pages succeeded, four live frontend files matched. Real checkout remains disabled awaiting merchant/packages; generic continue is not pricing or admin-account approval.
Implemented: Settings → Help & Customer Service now opens own-ticket creation/history/replies/close with atomic first message and retry UUIDs. Existing admin-role queue can reply, adjust priority, review/resume/resolve/close. Existing support RLS retained and lifecycle/identity/sender/timestamp/terminal-message guards added; client history deletion/TRUNCATE prevented. Settings Wallet placeholder corrected. No role assignment or customer data changes. Production currently has ZERO admin accounts; owner must identify an account before real support queue handling can begin.
Verified: 119 isolated PostgreSQL/DOM/media checks; syntax/whitespace; production migration/functions/triggers/grants, no-UID read isolation and unchanged advisors. Not Verified: production transactional lifecycle/concurrency, phone/two-account flows and actual admin operation. Support replies have no notification/email/push yet; attachments, spam limits and moderation/admin operations remain Incomplete. See docs/SUPPORT_CENTER_REVIEW.md and safe API rollback. Accepted call/Beauty files unchanged.

## 2026-10-10 Support page user acceptance
Support PR #18 merged; PR/main CI and Pages passed, three live frontend files matched. User inspected the Help & Customer Service page and reported no problem at 22:18 Malaysia. Record USER VERIFIED page inspection/no reported abnormality; do not infer a complete create/reply/close, two-account, admin or production concurrency acceptance. No administrator account has been designated.

## 2026-10-10 Plaza text feed
Implemented: existing Home/Me Plaza links now open a signed-in feed, actual Host-only text composer, User/Host likes/unlikes/comments, own content deletion, exact visible-count strings, pagination/polling and safe account cleanup. Repeated unchanged UUID submission prevents duplicates; desired like state avoids retry toggling. Own post deletion cascades related likes/comments. Existing HTTPS images can render; NEW image uploads are disabled. Six restrictive RLS policies enforce either-direction block visibility/interaction and blocked-commenter visibility, with own records available for self-removal. Identity/actor/time/content/media guards and narrowed client grants deployed; all new public APIs are invoker. No roles, seed posts or real customer content changed.
Verified: 131 isolated PostgreSQL/DOM/media checks plus syntax/whitespace; production migration/policies/triggers/grants/function metadata and no-UID empty feed, unchanged advisors. NOT VERIFIED: real production transactional publishing/interaction, phone/two-account flows, production concurrent block/write and browser visual acceptance. Incomplete: uploads, editing UI, quotas, moderation/admin/reporting/audit, activity notifications and push. See docs/PLAZA_REVIEW.md and safe API rollback. Existing accepted Beauty/call code unchanged. Merchant/packages/admin account still await owner input; ordinary continue does not supply those values.

## 2026-10-10 Plaza social card expansion
Owner rejected the sparse text-feed presentation and requested detailed author cards, compact social icons, options/block/report with attachments, sharing and gifts. Reference image was read successfully from the supplied scratch copy. Implemented: avatar/name/age/region/stored last-seen, SVG icon row, own bookmarks/repost marks and filters, block/options, categorized reason/evidence report with private Storage and retained text snapshot, share deep links/targets/native/copy, selectable existing gift catalog. Instagram/TikTok use native sharing where available or copy; no direct publishing claim. Gift Send stays DISABLED: no diamond/Host settlement rules approved. No gift prices seeded; five active gifts already existed.
Verified: 139 isolated PostgreSQL/DOM/media checks plus syntax/whitespace; production migration/RLS/invoker/anonymous denial/private bucket restrictions and no-UID empty reads. No real report/file/gift/financial mutations for verification. Advisors unchanged. NOT VERIFIED: actual Storage HTTP/image compression, production transactional mark/report/concurrency, desktop/phone visuals, cross-app share completion or stored presence accuracy. Admin moderation, orphan retention/quotas, post photo publishing and monetary gifts remain Incomplete. See docs/PLAZA_SOCIAL_REVIEW.md and safe API rollback. Accepted Beauty/call code unchanged.

## 2026-10-10 Plaza bottom sheets and media categories
Owner requested Instagram-inspired comment panel, round share panel and separate Photos/Reels, then clarified reference 2 means SHARE, not Repost. Implemented: bottom comments sheet with fixed emoji/input, real avatars/likes/author-liked/one-level replies; horizontal branded share icons and real recent Mimo contacts with explicit send/retry UUID; Photos three-column grid/detail sheet, independently filtered inline Reels, Host hosted-HTTPS media links with immutable media/server guards. No local media upload/transcoding/recommender is claimed; no seed posts or outbound test messages. Repost marks and gift-disabled behavior preserved. Accepted Beauty/call unchanged.
Verified: 148 isolated PostgreSQL/DOM/media checks and syntax/whitespace; live migration/RLS/columns/six invoker APIs/anonymous denial and no-UID empty reads. Advisors unchanged. NOT VERIFIED: real phone keyboard/layout/gestures, hosted video decoding, production transactional new actions/concurrency or completed external sharing. See docs/PLAZA_EXPERIENCE_REVIEW.md and safe API rollback. Distinguish the new Reels URL/player foundation from a full video-upload product.

Plaza share retry follow-up: one dialog retains request UUID per conversation even after reselecting a contact; the same-contact failure/reselection/retry path is covered by the existing interaction test. No database changes.

## 2026-10-10 Plaza interface user acceptance
User said “都对了” at 23:53 Malaysia for the new comments/share/Photos/Reels interface. Record USER VERIFIED interface inspection only; this does not certify production transactions/video transport/full device matrix. Local photo/video upload remains pending. The owner then prioritized private messaging presentation before uploads.

## Messaging presentation revision
Implemented: Instagram-inspired dark inbox/real quick contacts, loaded-chat search/All-Unread filters and SVG navigation; dark chat/profile/permission-gated voice/video routing/three-dot Block-Unblock, three abstract local themes, emoji tool, timestamps/avatars and safe existing image/Plaza-link cards. Fixed viewport/visual keyboard sizing and late-render/draft/header cleanup. Existing chat transport/RLS/receipt/block rules preserved; call.html and Beauty unchanged. No Notes/map/AI/story queue fabricated; photo upload/voice recording/video attachments remain incomplete and identified in tools. No DB migration, customer messages or call initiated for testing.
Verified: 153 isolated PostgreSQL/DOM/media checks, syntax/whitespace. NOT VERIFIED: desktop/phone visual acceptance, keyboard/gesture behavior, real image network fetch, header-call device navigation or two-account end-to-end interaction. See docs/MESSAGING_UI_REVIEW.md. Legacy unbounded history and comprehensive conversation lifecycle/retry overhaul remain deferred.

## 2026-10-11 Messaging interface acceptance / local media uploads
User said “欧克 可以了” around 00:20 Malaysia: USER VERIFIED current messaging interface inspection only. No inference of keyboard/two-account/device-call acceptance. Owner authorized continued work on local media upload.
Implemented: Host Plaza album picker (up to six resized JPEG photos), optional MP4/MOV/WebM Reel (UI limit 90 seconds / 30 MB), preview/remove, explicit publish and same-draft retry IDs; private-chat single photo picker via Plus → Send a photo, preview/explicit send/cancel with retained request and completed upload across retry. HEIC is accepted only when the device decoder supports it; otherwise export JPEG feedback. Existing hosted HTTPS and text paths remain. New private mimo-media bucket, owner/scoped upload paths, visible-post/participant reads, immutable referenced media and private image invoker send API. Durable URLs carry no token; read URLs expire after five minutes and refresh on active pages. A previously issued token can remain usable until expiry after blocking; chat history retains existing readable-after-block semantics. No call.html, Beauty or money changes.
Verified: 165 isolated PostgreSQL/DOM/media checks and syntax/whitespace; production migration/storage policies/bucket/function grants and advisor verification recorded in docs/MEDIA_UPLOAD_REVIEW.md. No customer post/message/file used for testing. NOT VERIFIED: real authenticated Storage HTTP upload/sign/download, phone HEIC decoding/orientation/keyboard, MOV/WebM codec interoperability, real two-account media transport/concurrency. UI selection/permission simulation is not a real Safari test.
Incomplete: resumable/background video upload, server video duration verification/transcoding, per-user storage quotas, automatic orphan retention/cleanup, media moderation, private-chat video/voice attachments. Failed or discarded drafts can leave owner-only orphan uploads; registered files cannot be client-deleted. Keep this distinction when reporting completion.

## 2026-10-11 Reel album compatibility follow-up
Owner reports photo selection works but video album selection cannot proceed. Record this as a reported video failure, not accepted upload completion or a confirmed cause. Source risks found: overly specific native accept filter, strict MIME rejection of mobile aliases/missing MIME, no explicit metadata load, and a file-picker result discarded while an ordinary feed read was busy. Implemented: native video/* picker, canonical type/extension mapping for MP4/M4V/MOV/WebM aliases and absent MIME (known extension only; contradictory types rejected), inline/muted explicit metadata load with handler/timer cleanup, retained picker result during feed reads (still locked during upload), selected filename/size/Publish guidance and distinct decode/duration failures. Five-minute private read tokens, bucket limits, caption requirement, RLS, photos, call and Beauty unchanged. No DB migration.
Verified: 168 automated checks, including 3 new mobile MIME/normalized upload/native-picker-to-publish checks; metadata load and resource cleanup verified with mocks, late-picker/feed-read preservation and caption guidance exercised on actual HTML. Syntax/whitespace pass. NOT VERIFIED: actual iPhone native picker or reported failure resolved, real selected codec/duration/upload, two-account playback. See docs/MEDIA_UPLOAD_REVIEW.md continuation.

## 2026-10-11 Explicit Reel confirmation
Owner reports some videos work, others appear to download and flash away without uploading; requested a checkmark confirmation like photos. Cause of native download/flash remains unconfirmed; iCloud import before file-input change is controlled by iOS, not the webpage. Implemented: a custom video preview confirmation dialog AFTER the native picker delivers a file; waits for valid duration, explicit ✓ Use this video, cancel/choose another, keeps previously confirmed Reel until replacement confirmed. Slow/oversized/unsupported video stays in an error/pending dialog instead of disappearing. Cloud-import guidance, suppressed automatic feed refresh while picker pending, feed pause, 45-second preview feedback, late-result/version/session cleanup. Confirmed metadata is reused at actual Publish; no second concurrent video decoder or duplicate inline video preview. Checkmark selects only; caption + Publish uploads. Photos unchanged. Limits remain 90 seconds/30 MB; no transcoding/size increase, database, call or Beauty edits.
Verified: 173 automated checks (5 new confirmation/cancel/error/late-result/slow-preview checks), JS/inline syntax and whitespace. NOT VERIFIED: actual iPhone/iCloud import flash resolved, codecs/large-video memory behavior or real upload completion. Generic continuation does not certify this. Existing incomplete media quota/retention/moderation/resumable roadmap remains.

## 2026-10-11 Reel confirmation user acceptance
After PR #26 deployment, user said “有了” around 01:57 Malaysia. Record USER VERIFIED availability of the requested Reel confirmation flow. This supersedes the preceding unaccepted UI checkpoint; it does not establish every iCloud/codec/large-file upload path or the exact original flash cause. Preserve the explicit confirmation and single-decoder design.

## 2026-10-11 Upload management
Implemented: Settings → Uploads & Storage, owner-only paginated metadata inventory, referenced/unused status, explicit single-file removal confirmation. Server only discards unreferenced own files older than 24 hours. Permanent discard claims serialize with authenticated post/message registration via per-path locks; claimed paths cannot publish/reupload/release. Storage API removes actual objects; no SQL metadata deletion, bulk or automatic cleanup. A failed remove retains the discard claim and supports removal retry; older drafts must reselect to upload to a new path. Existing photo/Reel/chat retry flows and accepted call/Beauty unchanged.
Verified locally: 179 automated checks plus JS/inline syntax and whitespace. Tests include owner isolation, age/reference protection, permanent claim surviving a rolled-back permission probe, discarded-reference/reupload denial, stable pagination, explicit confirmation/error/session cleanup. No customer files/posts/messages mutated for testing. Production migration and release verification will be recorded below. Not Verified: authenticated Storage HTTP deletion, actual parallel-session race behavior and physical-phone page acceptance. Incomplete: automated retention, quotas, report-evidence cleanup, media moderation/transcoding/resumable uploads. See docs/UPLOAD_MANAGER_REVIEW.md and safe rollback; never release discarded paths after ambiguous deletion.

Upload-manager production verification: migration applied on 2026-10-11 UTC after a transient request-state error and a read-only check confirming no partial deployment. Verified claim-table RLS, own SELECT/INSERT and denied UPDATE/DELETE/TRUNCATE, new Storage policies, invoker/VOLATILE helpers, anonymous execute denial, authenticated API grants, and zero inventory rows without Auth. Security advisors retain the previously documented warnings; no new finding. No customer file deletion or real cleanup claim was used for verification. Physical-phone deletion and parallel-session acceptance remain Not Verified.

## 2026-10-11 Reel playback and selected preview correction
Owner supplied two recordings and reports likes/comments restart the watching video; sharing continues correctly. Source confirmed load() paused all media and replaced feed/detail cards after mutation; comment opening paused explicitly. Implemented keyed in-place updates preserving unchanged connected player/source/progress while refreshing counts and callbacks, no pause on opening comments. Removed/hidden or changed media release sources/signing bindings; late signing cannot revive retired media. Appropriate view/native-picker/background/logout cleanup retained. No force seek or automatic resume workaround.
Owner explicitly requested replacing selected filename/size/duration + Preview summary with playable video. Implemented inline confirmed preview with native controls, Change video/Remove and short confirmation guidance. Checkmark, cached preparation, prior file on cancellation, explicit Publish and limits retained. Modal and inline preview release sources before handing off; one selected preview source active at a time. This supersedes the earlier text-only-summary requirement/design.
Verified: 183 automated checks, including real-page like/open-comment/post/comment-like preserving node/src/time without pause/load/re-sign, removal/late signing cleanup, inline preview/no filename and replacement cancellation/source release; syntax/whitespace pass. Not Verified: physical-phone uninterrupted frames/audio and updated preview acceptance. No database or customer media/interaction changes for verification; accepted Beauty/call untouched. See docs/REEL_PLAYBACK_REVIEW.md. PR #27 upload management was previously merged; its regression/Pages succeeded and all three live files matched the release.

## 2026-10-11 Reel continuity/preview user acceptance and opening cover
User said “都可以了” around 13:27 Malaysia after PR #28: USER VERIFIED reported playback and inline-preview corrections. Do not infer exhaustive device/codec tests. PR #28 regression/main/Pages passed and five live files matched the release.
Owner then supplied two screenshots: combined format/30 MB error and posted no-poster Reel. Existing limits are 90 seconds and 30 MB; screenshot 1 does not prove duration was the failed condition. Implemented separate format/empty/size messages, preserving duration/size limits. Publishing a local Reel with no manual images now captures a bounded JPEG opening frame from the existing confirmed inline player, uploads it under the existing post image path and attaches it as cover via existing API. Manual photos/links remain preferred. Capture waits for a decoded seeked frame, caches exact File across retry, has timeout/session/source suppression and does not start a second decoder. Old/hosted no-poster players request opening metadata/frame without autoplay; no customer backfill.
Verified: 187 automated checks plus JS/inline syntax/whitespace, including automatic cover reference/manual-cover preservation, JPEG sizing/retry/time restoration/timeout/session failure, distinct errors and historical non-autoplay fallback. No production database or customer content/file changes for verification. Not Verified: real phone frame/colors/codecs, actual Storage cover transport/two-account poster display. An opening that is intrinsically black remains black; no later-frame selection claimed. See docs/REEL_COVER_REVIEW.md. Existing accepted Beauty/call and playback continuity retained.

## 2026-10-11 Owner-approved three-minute Reel limit
Owner explicitly requested increasing local video duration to 3 minutes. Implemented: metadata confirmation, prepared-file gate, fallback upload decoder validation and composer guidance now allow up to 180 seconds; 30 MB bucket/client size limit and formats remain unchanged. Prior 90-second statements are historical and superseded for local uploads. Confirm/cancel, automatic/manual covers, draft retry, private permissions and continuous playback preserved. No database, call/Beauty or financial changes.
Verified: 188 automated checks, including 120/179/180-second confirmation and >180-second denial; syntax/whitespace pass. This is client duration validation, not server video-duration enforcement or transcoding. Not Verified: physical-phone upload/playback of a three-minute file. PR #29 cover release succeeded and four live frontend files matched; cover phone acceptance remains pending.

## 2026-10-11 Plaza visible muted autoplay

- Implemented: `reel-playback.js` controls only Plaza feed videos. Scroll-visible playback is muted by default, one active video at a time, looped. Tap video or Sound button for audio. Scroll-away/new activation/background resets mute. Native selection/detail/external previews suspend feed; comments and sharing preserve it.
- Verified (automated): visibility, gesture, stable player/time, background, picker, external preview, readiness, removal/session cleanup, rejected/late promise fallback. Prior continuous like/comment playback, three-minute upload limit and opening cover tests retained. See `docs/REEL_AUTOPLAY_REVIEW.md`.
- Not Verified: production media autoplay/audio on real iPhone/Android, browser power/settings restrictions. Explicit Play fallback exists. Do not mark physical acceptance until user confirms.
- Calls/Beauty/database unchanged. Composer video retains its confirmation and native controls.

## 2026-10-11 Immersive Reels and Following

- User Verified: previous Plaza muted autoplay accepted (user: “都可以了”). New requirement: outside Sound button toggles audio; picture opens Reels with vertical swiping and Following mode.
- Implemented: `reels-viewer.js` uses scroll-snap, one player, automatic next-page fetch, back/retry/empty states, generation/session guards. Selected position/sound transferred on entry; browser Play fallback retained. Shared keyed media/actions preserve like/comment playback. Following added to Plaza and Reels top bar.
- Database: additive following filter in existing `mimo_plaza_feed_v3` before limit/offset; existing modes/shape/SECURITY INVOKER/RLS/permissions retained. Production `20261011060905_mimo_following_reels.sql` applied; live own-follow/auth guard metadata verified. Security/performance advisors unchanged. No customer data modified. Rollback: `database/rollback-following-reels.sql` after frontend rollback.
- Verified: 198 automatic checks, actual Plaza/immersive interaction continuity, independent viewer lifecycle/paging/race tests and isolated follow/block/auth SQL checks. See `docs/REELS_VIEWER_REVIEW.md`.
- Not Verified: current release physical-phone swipe/layout/audio handoff and actual-account Following/production video stream. Do not mark tested on phone based on DOM mocks. Beauty/call and upload confirmation/cover/3-minute constraints retained.

## 2026-10-11 Reels entry sound / pause correction

- User request after viewing Reels release: enter with sound, support manual mute and pause.
- Implemented: viewer starts audible via synchronous gesture playback; existing signed source/position adopted on entry. Full-screen Sound, Pause/Resume and picture tap controls. Mute choice persists across viewer swipes; each fresh entry resets sound on. Outer Plaza stays muted by default. Manual pause retained across metadata, late promises, refresh and background. Signed-source renewal preserves paused position and rejects stale/late replacements.
- Verified: 201 automated checks plus JS/inline syntax and diff. Prior Plaza/Reels continuity, upload, follow RLS and session tests retained. Database/call/Beauty unchanged.
- Not Verified: this correction on physical phone (audio policy fallback retained). See updated `docs/REELS_VIEWER_REVIEW.md`. Do not label real-phone acceptance based on automated tests.

## 2026-10-11 Reels center controls / hold / seek

- Implemented: `reel-controls.js` viewer-only center Pause/Resume, hold-to-pause/release-to-resume (200 ms), native vertical swipe cancellation, release-click suppression, m:ss range seeking (0.1 sec). Manual pause retained on hold/release, seek and social refresh. Inactive/background/disposed player cannot be resumed by stale release. Listener/timer/DOM cleanup integrated.
- Verified: 205 automatic checks; actual Plaza/Reels tests load the controls module; lifecycle/gesture/seek tests plus syntax and diff pass. No database/call/Beauty modifications. Outer muted Plaza unchanged.
- Not Verified: current release on phone (center visual/touch swipe/slider/production media seeking). See updated `docs/REELS_VIEWER_REVIEW.md`.

## 2026-10-11 Reels center icon correction
- Implemented: reference-style white rounded SVG play triangle on dark circular background, visible only when paused. Playing hides the center button completely; picture tap/hold, sound and seeking retained.
- Verified: 206 automatic checks, including hidden during playing / shown paused / hidden on resume. Not Verified: current appearance on physical phone. No DB/call/Beauty change.

## 2026-10-11 Reels centered tabs / Follow / visible-video comments
- Implemented: centered Reels/Following switcher; compact Follow/Following beside author with actual Supabase follows read/write/read-back, privacy/block checks, no self-follow, retry and session guards. Existing follow RLS retained.
- Implemented: bottom comment entry opens the existing composer as a dark panel inside Reels; existing video shrinks above it (38% / 62%), retains player/source/time/sound and manual-pause state. Playback pins the current Reel while comments are open; close restores the same scroll index. ResizeObserver handles viewport/keyboard reflow; nested Escape closes comments only. Normal Plaza comments remain modal.
- Verified: 209 automated checks, including real component state/read/write mocks, failure retry, shared author state, stale follow response after logout, later-Reel comment opening/closing with no player reset or mute. Existing upload, follow database/RLS and playback tests retained; syntax and whitespace checks pass.
- Not Verified: physical phone appearance, keyboard/reflow, production-account follow/unfollow and commenting for this release. DOM tests are not phone acceptance. No call/Beauty/database schema changes.

## 2026-10-11 Reels missing Follow correction
- User reported compact Follow missing. Root cause: decorator used document.getElementById for shared post ids and found outer Plaza card first, skipping Reels controls. Scope lookup to viewer stream children. Comment entry is fixed by the same correction.
- Verified: 210 automated checks including a post present in both outer feed and viewer; one Follow and comment entry appear in viewer after refresh without decorating outer feed. Cache version bumped. Not Verified: physical phone acceptance. No database/call/Beauty changes.

## 2026-10-11 Reels gift actions / dark comments / keyboard stability
- User phone screenshots verify compact Follow now visible and reveal white discussion inherited from global section styling. User recording shows focus/keyboard pans the overlay into the underlying feed. This is a real reported failure, not verified phone stability.
- Implemented: viewer-only action stack Like, Comments, Gift, Share; removed Repost and Save from Reels and hid duplicate media gift. Gift retains existing real gift flow. Ordinary Plaza actions remain unchanged.
- Implemented: dark discussion/list/rows/input with clear text, compact header, subtle borders, pink accents. Explicit discussion background override removes inherited white section. Composer font 16px avoids iOS focus zoom.
- Implemented: freeze preview height in pixels when comments open (30% initial viewport, 120–240px), rather than resize it with keyboard. VisualViewport height and offset position the overlay; only remaining discussion height changes. Keyboard mode hides quick emoji row to preserve comment/input space. Body scroll locks while viewer is open and is restored on close. Existing same-player pin/time/sound/manual-pause behavior preserved.
- Verified: 212 automated checks including gift handler/action refresh, viewport resize/pan/input/keyboard close retaining preview height and player time, dark computed discussion background and 16px composer. Syntax/diff checks pass.
- Not Verified: this fix on physical iOS Safari (real keyboard, browser chrome and gift transaction). Browser-render check unavailable because test Chromium download returned an invalid archive; DOM/layout-state tests are not phone acceptance. No database/call/Beauty changes.

## 2026-10-11 Plaza colored gift / centered comment title / functional handle
- User screenshots confirm previous dark comment styling visible on phone; keyboard behavior was not explicitly accepted. User requests same gift action in outer Plaza, no media overlay gift, colored icon, truly centered Comments and functional drag handle.
- Implemented: shared Plaza/Reels action renderer uses Like, Comments, Gift, Share; no Repost/Save buttons and no media gift overlay. Existing saved/repost records/backend remain intact. Shared deterministic SVG gift has pink box, golden ribbon and lavender bow; existing gift handler retained.
- Implemented: Comments header uses symmetric side columns and centered title. Actual button replaces decorative pseudo handle, supports downward drag >=64px to close and tap/keyboard activation; short drag/cancel keeps sheet/draft. Generated drag click suppressed; busy/disposal guards and listener cleanup retained.
- Verified: 213 automated checks including gesture dismissal/cancel/busy/disposal, shared gift rendering and callback after refresh, unchanged keyed player and viewport tests. Syntax/inline/diff checks pass.
- Not Verified: current colored icon/title alignment and drag on physical phone or live gift transaction. No database/call/Beauty changes.

## 2026-10-11 Keyboard comment-space correction after phone rejection
- User explicitly accepts other latest changes but rejects keyboard fixation. Mimo recording/screenshot shows large preview + title + repeated caption + Saved feedback leave almost no scrollable list above Safari keyboard/accessory. IG reference retains usable comment scrolling. Previous keyboard fix is not User Verified; mark phone rejection.
- Implemented: capture fixed full stage height when opening comments; keyboard updates bottom inset of sheet instead of stage height. Smaller initial preview (22% initial viewport, 96–176px) remains constant. Compact title/handle/composer reserve more list room. Repeated selectedBody is hidden only in Reels; successful comment status no longer leaves Saved text occupying input space. Error messages remain.
- Implemented: explicit flex scroll region with zero flex-basis/min-height, overflow-y auto, pan-y touch and iOS momentum scrolling, independent from pinned video.
- Verified: 213 checks including strengthened viewport/pan/input test: unchanged captured stage/preview height, keyboard bottom inset, comment scrollTop retained while typing, scroll overflow and hidden repeated caption; keyed player/time/sound retained. Syntax/inline/diff pass.
- Not Verified: current physical Safari keyboard stability and comment scrolling. User phone acceptance still required; DOM mocks are not iOS verification. No database/call/Beauty changes.

## 2026-10-11 Private chat confirmed video attachments
- Implemented: Chat + → Send a video; native album category, playable preview and explicit ✓ Use this video confirmation before a separate Send video. Reuses the accepted Reel picker with neutral Video labels. MP4/MOV/WebM, 3-minute client duration and 30 MiB upload limit; no auto-play/audio in received chat bubbles. Inbox distinguishes Video from empty text.
- Implemented: durable token-free video_url, SECURITY INVOKER retry-safe mimo_send_video, private Storage signed playback, sender/conversation/message ownership and MIME/size checks. Existing contact/RLS/read receipts retained. Cleanup references include videos and retain permanent claim/advisory-lock protection. Retry keeps upload and request UUID; account disposal removes drafts and ignores late results. Paused signed-source renewal retains position; active playback is not replaced.
- Verified: 217 automated checks; added private video sender/recipient/third-party/anonymous/no-UID isolation, missing/mismatched/oversized/tokenized/claimed reference denial, block/retry/read-receipt/cleanup tests; actual chat confirmation/retry/success/disposal and safe video/inbox rendering tests. Syntax/inline/diff checks pass. Migration applied live; video column, invoker/empty search_path/execute grants and no-UID upload/read denial checked. No customer message/file created for production testing.
- Not Verified: physical iOS album/cloud import, two-account production video sending/playback and codec compatibility. Duration is enforced by the browser, not server transcoding. Prior Reels keyboard fixation remains Not Verified pending explicit phone acceptance. Voice recording remains Incomplete; call.html and Beauty untouched.

## 2026-10-11 Private chat voice messages
- Implemented: Chat + → Voice message, hold-to-record/release-to-send, slide up >=64px or Cancel recording to discard; keyboard/screen-reader activation starts/stops. 60-second/5 MiB recording bounds, runtime-supported audio/mp4 or audio/webm selection. No microphone access without action. Permission prompt release/timeout, short capture, recorder error, pointer cancellation, background and account/page disposal stop resources and suppress unintended sends. Failed uploads/sends keep local playable audio and stable request/upload ID for retry or discard.
- Implemented: no-autoplay private native audio bubbles and Voice message inbox label; at most one chat media player plays. Token-free audio_url/audio_duration_ms with invoker-only retry-safe mimo_send_voice, contact/block/RLS/unread protections, object MIME/size/path/identity validation. Existing cleanup locks/permanent claims include audio; post media permissions remain image/video only.
- Verified: 228 automated checks including microphone track release, hold/release/cancel/late permission/logout/error/keyboard/limit state tests, actual chat recorder-to-send wiring, retry/disposal and safe rendering; isolated PostgreSQL tests for private visibility, block, ownership, MIME/size/duration-shape/retry/read-receipt/cleanup. Syntax/inline/diff checks pass. Migration applied live; audio columns/bucket/RPC empty search_path/invoker/execute grants/no-UID media denial checked. Advisors unchanged. No customer messages/files created for production tests.
- Not Verified: real iOS/Android microphone capture quality, permission gesture/accessory behavior, two-account send/receive and cross-device MP4/WebM codec playback. Server validates claimed duration bounds and object metadata; no server decoding/transcoding/duration measurement. Private video and Reels keyboard remain pending explicit phone acceptance. call.html and Beauty untouched.

## 2026-10-11 Mobile page/input stability
- User requests app-like pages/chat without accidental zoom. Implemented shared mobile-layout CSS/JS on 19 regular pages: coarse-pointer page/scroll gestures allow panning; touch/gesture handlers prevent cancelable multi-touch page scaling only on touch devices. Single-finger scroll/click/input remain normal; listeners detach on pagehide, restore once on persisted pageshow and dispose cleanly. Text editing inputs/selects use 16px on touch screens; range/file/checkbox/radio controls are excluded from font changes. Existing dedicated hold/seek/drag touch-action rules retain greater specificity.
- Implemented: chat input and ordinary Plaza comment field upgraded from 13px to 16px. Chat and Reels comment viewport controllers ignore scale !=1 resize/pan events instead of treating pinch shrinking as keyboard height changes. Real keyboard at scale 1 still adjusts available input/list space; drafts/list scroll/player/time/sound are retained.
- Verified: 232 automated checks, including single/multi-touch/cancelability/desktop/lifecycle gestures, real chat viewport zoom-vs-keyboard/draft/list/disposal, readable fields/excluded slider sizing, strengthened Reels viewport scale/player/scroll assertions. All 19 edited page inline scripts and changed JS syntax/diff pass. Existing voice/video/receipt/contact/Beauty/call regression checks pass. No database migration or call.html/Beauty changes.
- Not Verified: physical iOS/Android double-tap/pinch/focus/keyboard/chrome behavior. Browser/OS zoom, accessibility and native fullscreen controls cannot be guaranteed disabled; this is app-page gesture/geometry protection, not a native app zoom lock. User confirmation of previous Reels keyboard behavior still pending.

## 2026-10-11 — Support request in-app notifications

Implemented: administrator replies and status changes now notify the requester, with a direct authorized ticket link. System Messages controls delivery; no settings defaults enabled. Generic notification body avoids copying private replies. Matching retries, self messages and priority-only updates do not duplicate notices. No historical backfill.

Automated Verified: 234 checks including notification authority, preference suppression, retry safety and direct ticket opening beyond the first list page. See docs/SUPPORT_NOTIFICATIONS_REVIEW.md. User Verified: none for this batch. Not Verified: real admin/user production workflow and phone acceptance. Incomplete: administrator identity assignment, push/email and support attachments. Existing call and Beauty code untouched.

## 2026-10-11 — Fixed Home layout

User Verified: the earlier mobile anti-zoom/layout improvement was explicitly accepted as satisfactory. User requested the Home page also remain fixed. Implemented: Home uses a fixed viewport grid with stationary header and bottom navigation, safe-area spacing, and a separate middle content scroller. Stories and filters retain horizontal scrolling; host actions, call routing and incoming-call behavior remain unchanged. Automated verification uses the existing regression suite and script syntax checks. Actual iPhone Home scrolling/keyboard acceptance is Not Verified.

## 2026-10-11 — Home accepted; Plaza interaction notifications

User Verified: user explicitly checked the fixed Home layout and is completely satisfied. This supersedes the pending Home acceptance above.

Implemented: new post likes/comments notify the post author, with a validated direct post link and a generic private preview. Activity Posts controls delivery, missing settings default enabled. Self and blocked interactions are excluded. Matching retries do not duplicate notifications; unlike/re-like does not repeatedly notify the same author for the same post/actor while notice history exists. No backfill. Existing playback/UI untouched. Automated checks and production metadata verification accompany deployment. User Verified: none for this batch. Not Verified: real two-account/phone acceptance. Incomplete: follower new-post broadcasts, comment-author reply notifications, push/email.

## 2026-10-12 — Text / voice composer switch

Implemented: a microphone/keyboard toggle beside the chat composer switches between typing and the existing hold-to-talk recorder in the same input position. Text drafts remain intact; failed voice drafts are preserved across modes. Switching mode alone never requests microphone access. Startup does not focus the keyboard; explicit return to text focuses with preventScroll. Recording/upload work blocks accidental mode changes; cancellation remains available. The existing plus-menu voice shortcut now selects voice mode. Logout disables the mode switch. Existing media upload/RPC and call code unchanged.

Automated Verified: 236 checks, including actual composer mode/draft/permission/busy behavior plus existing recording/upload regressions. User Verified: none for this batch. Not Verified: iPhone keyboard transition and physical recording acceptance.

## 2026-10-12 — Compact voice bubbles, recording meter, recall/edit

Implemented: voice bubbles now show sound waves and seconds with tap playback. Recording displays a central real microphone-level meter, elapsed time and slide-cancel feedback. Own messages of all types support Recall; text supports Edit. Payload/media references are cleared on recall, text edits use optimistic revisions, retry drafts are retained, and receipt-only updates do not restart players. Gift recall does not refund ledger transfers. Fixed historical chat reads missing video/audio fields. Realtime plus foreground polling synchronizes edits/recalls.

Automated Verified: 242 checks, syntax/diff and production API metadata/advisors. User Verified: none for this batch. Not Verified: physical phone appearance/meter/recording and real two-account acceptance. See docs/CHAT_MESSAGE_ACTIONS_REVIEW.md for permissions, rollback and signed-URL expiry limits. Existing call/Beauty code untouched.


## 2026-10-12 — Smaller voice messages and quiet sending UI

Implemented: idle voice mode and normal uploads no longer show the bottom status/native audio/retry panel. Failed sends retain the recording and show recovery controls; retry hides the panel during upload, and success/discard clears it. Recorder errors remain visible. Sound-wave icons reduced from 26px to 18px, short voice bubbles narrowed, and the old own-message column layout corrected so message options/receipts do not create large vertical gaps. Shared assets cache versions updated.

Automated Verified: 242 regression checks, including hidden pending/success UI and visible failed-send recovery, plus JavaScript syntax and diff checks. User Verified: none for this batch. Not Verified: physical iPhone appearance and recording acceptance. Call/Beauty/Reels/Home code unchanged.


## 2026-10-12 — Voice bubble height follow-up

User report: voice bubbles remained too large after the first icon reduction. Implemented: dedicated compact voice-message layout with timestamp beside playback instead of underneath, 6px vertical padding, 16px waves, 13px duration and narrower duration-dependent width. Normal short voice bubbles target 44px height; text/image/video styling and playback logic unchanged. Cache versions advanced.

Automated Verified: 242 regression checks and JavaScript syntax/diff checks. User Verified: none for this follow-up. Not Verified: actual iPhone visual acceptance. Earlier screenshot confirms the previous appearance was not accepted; do not mark voice styling as User Verified.


## 2026-10-12 — Parent-commenter reply notifications

Implemented: new comment replies notify the parent commenter independently of the existing post-author notice. Host replies to a viewer now notify that viewer. Self replies and parent/post-author overlap do not create duplicate parent notices. Activity Posts preferences and actor/post-owner block visibility apply independently. Generic body, existing direct post link, no historical backfill. Existing playback/layout unchanged.

Automated Verified: 243 regression checks including PostgreSQL authorization, recipients, retries, independent settings, visibility and rollback. Production metadata/advisors are checked during deployment; no customer interactions inserted for testing. User Verified: none for this batch; the latest voice bubble appearance also still awaits explicit acceptance. Not Verified: real two-account phone reply notification workflow. Incomplete: follower new-post broadcasts, push/email. See docs/PLAZA_NOTIFICATIONS_REVIEW.md.

Production Verified (metadata): reply migration applied, both comment notification triggers enabled, client execution denied, empty search path confirmed, security/performance advisors unchanged. This is not a real two-account workflow acceptance.


## 2026-10-12 — Followed Host post notifications

Implemented: new authenticated Host posts notify current followers, respecting Activity Posts and blocks, excluding self. Generic preview links to the post. No old-post replay when following, no edit/retry duplication. Synchronous set-based insert; no push/email/background fan-out. Automated Verified: 244 regression checks and syntax/diff checks. User Verified: none. Not Verified: production two-account phone workflow and large fan-out latency. Reply and follower in-app notification producers are now implemented; physical acceptance remains pending.

Production metadata verified: follower producer migration applied; enabled INSERT trigger, private empty-search-path definer and denied client EXECUTE confirmed. Advisors unchanged. No real customer publish/follow actions were created for testing.


## 2026-10-12 — Private support screenshots

Implemented: one optional compressed photo on new support requests and replies, preview/removal, retained failed drafts/stable retry IDs, private storage and owner/admin-linked image access. Text remains required; legacy text APIs preserved. Images signed for 300 seconds with stale session/ticket guards. No client file overwrite/delete. Automated Verified: 249 checks and syntax/diff checks; see docs/SUPPORT_IMAGES_REVIEW.md for access and rollback. User Verified: none. Not Verified: actual Storage HTTP, iPhone appearance/album and production admin workflow. Incomplete: multiple/video/document files, orphan retention, quotas/moderation. Owner still must specify a registered admin email; no account was chosen or elevated. CLI telemetry was rejected automatically after migration creation; no retry/bypass.

Production metadata verified: private 3 MiB JPEG bucket, Storage policies, invoker APIs, empty search paths and anonymous denial confirmed. Security advisors unchanged. Performance findings differ only by the new attachment-path index not yet used; retained deliberately for attachment lookup growth ([Supabase unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)). No customer records/files were created.


## 2026-10-12 — Support navigation feedback

User Verified: owner reports support submissions work. Do not infer attachment viewing/admin workflows or comprehensive lifecycle acceptance. User Verified: followed Host publishing generates a station/in-app notice. User requests phone system push/sound, which is a separate incomplete capability. Implemented: support header now has a clear Home link directly to index.html, independent of loading/saving handlers. User Verified: none for navigation fix.


## 2026-10-12 — Phone system push

Implemented: Home Screen manifest/icons, explicit device enable/disable in Notifications settings, push-only service worker, authenticated subscriptions and Supabase Edge encrypted sender. Generic system notices link to supported app destinations. Existing notification categories/read status/blocks enforced at dispatch; active Auth session required, logout/session revocation stops future queued delivery. Vault-held VAPID/private wake secret; no secret keys exposed. Instant asynchronous wake plus minute retries with bounded queue lifetime. Worker does not cache/fetch-intercept app/call/media.

Automated Verified: 256 checks, JS/inline/diff; production 401 denial and metadata/cron verified. User Verified: support submission and followed-post in-app delivery accepted (not system push). Not Verified: real iPhone install/consent, real-session VAPID initialization, provider delivery, sound/banner and logout acceptance. Sounds and notification priority remain controlled by OS/Focus settings. Incomplete: unsupported provider hosts, subscription-change automation, high-volume operations. See docs/WEB_PUSH_REVIEW.md and safe rollback.

Managed migration 20261012005350 recorded by MCP; CLI telemetry not retried. Security advisors include deliberate default-deny private-table INFO and pg_net public-registration WARN; net remains outside Data API (406 probe), restricted application wake functions cannot be called by clients. Automatic approval rejected optional pg_net relocation as potentially disruptive; no bypass/retry, current working placement retained.

Delivery failure isolation: managed migration 20261012010405 locks subscription references during enqueue and catches optional wake/network failures, preserving ordinary notification/message/post saves. Mocked unavailable net.http_post test confirms in-app history survives; retry queue remains available. This strengthens core-flow protection without changing notification permissions.


## 2026-10-12 — Foreground browser banners and sound

Owner chooses notification banners/sound while a normal browser page is open, without iPhone Home Screen installation. Implemented: shared scoped banners on 18 authenticated pages, trusted-interaction Web Audio chime, browser-local banner/sound switches in Notifications settings, category preferences, own realtime with 15-second polling fallback, safe direct destinations, initial/background history silence, read/logout/account cleanup and confirmed native-push deduplication. Active chat/call and audible media/recording avoid duplicate interruption. Call/Beauty modules unchanged.

Automated Verified: 263 checks including seven focused foreground tests; JS/HTML syntax and diff checks. Production Verified (metadata): managed migration 20261012012933 adds notifications to supabase_realtime; RLS enabled and own SELECT/UPDATE policies retained, no new grants or customer test records. User Verified: none for this batch. Not Verified: actual iPhone appearance/chime, real two-account delivery and system push. Closed/background/locked pages still require system push; iPhone native push installation requirement remains. See docs/FOREGROUND_NOTIFICATIONS_REVIEW.md for bounded polling/queue, deduplication and rollback limits.


## 2026-10-12 — Foreground notification sound follow-up

User Verified: notification banners appear. User reports no notification sound; previous Web Audio sound is NOT accepted. Implemented: dedicated self-contained PCM media chime replaces Web Audio; capture-phase touch/click/keyboard unlocking, retained media readiness on visibility return, explicit Test sound in Notifications settings and Enable sound on locked/failed banners. Failure keeps the notice and permits a gesture retry. Disabling sound stops its player; logout/navigation cancels pending unlock and unloads audio. No global audio-session type, call/Beauty code, Supabase grants or notification producer changed.

Automated Verified: 266 checks including ten foreground tests for media PCM structure, rejection/retry, visible return and late cleanup, plus existing notification/preferences/media continuity checks. User Verified: sound still pending; actual iPhone audibility cannot be inferred from browser playback promises or DOM tests. Exact cause on the user's device remains unconfirmed. Sound still depends on page interaction and media volume/output. See docs/FOREGROUND_NOTIFICATIONS_REVIEW.md.


## 2026-10-12 — Foreground notification acceptance

User Verified: owner confirms notice appears, then confirms sound works after the media-chime correction (Malaysia 15:23). This accepts foreground banner/chime on the tested device only; it does not verify installed/background/lock-screen system push or all browsers.

## 2026-10-12 — Plaza Report Center

Implemented: Settings → Report Center, submitted-report link, own paginated report/status/snapshot/private-evidence history and filtered admin queue. Admin review has public response, guarded status transitions, expected-revision updates and append-only audit history. Terminal reviews do not reopen; failed response drafts retained. Fixed old report-author INSERT policy name resolution without editing historical reports. Post deletion still detaches only the original link, preserving report/snapshot/review history. No automatic post removal or account sanction added.

Automated Verified: 278 checks, JS/three inline scripts/diff and production migration 20261012075303/RLS/grant/trigger metadata. Security advisors unchanged; performance removes one initplan warning and adds one unused admin-FK index. User Verified: none for this batch. Not Verified: physical phone page, real signed image HTTP, actual admin workflow/parallel sessions. Production admin count is still zero; owner must supply an existing registered email before promotion. No customer report/review/files were mutated for testing. Remaining moderation sanctions/appeals/notifications and legacy generic reports UI are separate. See docs/REPORT_CENTER_REVIEW.md and safe rollback. Existing Call/Beauty modules untouched.


## 2026-10-12 — Owner-designated administrator provisioned

Owner explicitly supplied the registered account to promote. Production lookup confirmed exactly one email-confirmed Auth user with matching profile and prior role user; a guarded server transaction changed only that profile role to admin. Production read-back confirms is_admin=true. The designated identity is intentionally omitted from the public repository. Earlier zero-admin statements are now historical. Support and Report Center admin access is configured; actual login/phone/ticket/review acceptance remains Not Verified. No other account was elevated and no customer ticket/report/file was mutated for verification.


## 2026-10-12 — Host preview / rich profile / greetings / Host reporting

Implemented: Home Host photo opens a bottom preview; identity opens a new detailed photo-led profile with real gallery (avatar + visible recent post photos), bio/tags/details, About/Updates and fixed actions. Follow/Chat/existing call/appointment routes preserve permissions. Explicit 打招呼 sends “你好，在干嘛呢？” with stable retry ID, then loads the returned conversation after participant validation. Browsing never sends. Host ⋯ has Report host and Block/Unblock; category/reason/up to 3 private screenshots submit to the new Hosts channel in Report Center with guarded admin reviews/audit. Support admins default to Customer support queue, with own form under My requests. No invented badges/ratings/distance. Incoming Home calls dismiss optional preview and remain actionable; call.html/Beauty unchanged.

Automated Verified: 296 regression checks including 18 new PostgreSQL/DOM checks, five inline scripts, changed JS/diff checks. Production metadata Verified: managed migration 20261012092515, RLS/trigger/grant/private audit guards, no-UID empty reads and retained-evidence restriction; security advisors unchanged, one new unused admin FK index. User Verified: none for this batch; real phone/browser, two-account greeting/Host report/admin workflow and actual Storage HTTP remain pending. Existing account-deletion cascades/global chat-creation race limits remain; gallery shows visible recent post photos, not a new private album feature. No customer messages/reports/files/reviews created for testing. See docs/HOST_PROFILE_REVIEW.md and rollback. Real payments remain disabled.


## 2026-10-12 — Functional development paused; Rose & Champagne visual theme

Owner explicitly pauses new features to prioritize the supplied romantic pink/champagne style reference. Implemented shared scoped theme on 22 product pages: deep rose Home/Host profile, cream-pink chat/settings/notifications/Me/Plaza, coordinated controls/cards/navigation and dark warm Reels/call accents. Home hero uses a real visible Host avatar, no new fake profiles/badges/stats. Existing navigation routes preserved. No schema, permission, payment or customer-data changes. Call/Beauty inline scripts are byte-identical; media pixels/player/keyboard/scroll geometry retained.

Automated Verified: 296 regression checks, 23 inline scripts, call/Beauty script identity and diff. User Verified: none for new theme. Not Verified: actual phone visual/contrast/keyboard/media-state acceptance; do not call screenshot similarity verified from DOM tests. See docs/MIMO_VISUAL_THEME.md. Functional roadmap remains paused pending owner direction.

## 2026-10-12 — Preview style approved for formal website

Owner likes the separate four-page visual preview, then explicitly requests replacing the formal website with it (Malaysia 21:51). Implemented: promote candidate layout/styles and preview-reviewed corrections to actual Home / Host profile / Plaza / Chat; use existing decorative reference assets while retaining real profiles/posts/messages/counts and all live permission/action handlers. Offline fixture code and fabricated example data are excluded. No DB/payment/customer mutation; Call/Beauty files unchanged. Automated Verified: 298 regression checks, four inline scripts/IDs, adapter syntax and diff. User Verified: separate visual preview appearance accepted, publication authorized; this is not live production/device/transaction acceptance. Not Verified: production phone appearance/keyboard and actual-account workflows after publication. No pixel-identical claim. See docs/MIMO_REFERENCE_LIVE_RELEASE.md. Functional roadmap remains paused for visual feedback.

## 2026-10-13 Malaysia — Second approved design promoted to formal pages

Owner explicitly accepts the second mobile preview and authorizes replacing formal Mimo. Marked removals: the simulated **earpiece (听筒)** control in voice-call preview and simulated clock/signal/battery chrome. Microphone mute and chat voice recording were not the circled control and remain functional.

Implemented: presentation-only adaptation on Home, Host, Plaza, Messages, Chat, Notifications, Me, Settings and Call; identical accessible five-tab navigation, warm cream social/chat pages, dark discovery/profile, single-column Plaza, real identity over decorative Me artwork and coordinated call controls. Real data and existing handlers retained; offline preview/fake prices/profiles/counters excluded. Existing call inline RTC/Beauty scripts byte-identical; video geometry/PiP handlers untouched. No database, customer data, payments or permission changes. Preview removals also applied.

Automated Verified: 300 regression checks plus 3 independent preview checks, syntax, controller ID/navigation consistency and call/all-page inline-script identity. User Verified: second preview general appearance accepted; production adaptation and phone keyboard/call/media flows are Not Verified until explicit feedback. Deployment/Pages/browser verification recorded with release. See docs/MIMO_DESIGN_V2_LIVE_RELEASE.md. Functional roadmap remains paused for design feedback; financial features stay disabled.

## 2026-10-13 Malaysia — Comparison-driven interface reconstruction

Owner rejects the earlier production adaptation: old structures/icons were retained. Supplied eight live-vs-approved-preview comparison pairs and explicitly requests replacing old visible UI, with subsequent feature refinements later. Implemented a new reference-based composition and exact SVG path system on nine pages, replacing Inbox/Settings/Me menus, Host action structure, Plaza compact album/action rows, Notification rows, Chat shortcuts/composer and Call icons. 393px centered desktop composition; phone width adapts. Old theme overrides removed. Actual existing inline controller/RTC/Beauty scripts are byte-identical; real names/photos/messages/balances remain real. Extra old call Beauty/Flip entries hidden to match the requested visible controls; underlying processing/functions remain. No DB/RLS/payments/customer mutations.

New adapter delegates real photo/call/follow/read handlers, protects late account identity reads, preserves player nodes/time and includes menu/category placeholders where the reference does not have implemented data/features. No fictitious sample stats, price/certification or wallet values are assigned to real accounts. `replica-review/` is a public, labeled, read-only visual fixture; its synthetic example data never runs in formal pages. See docs/MIMO_REPLICA_CORRECTION.md for limits/rollback.

Automated Verified: 307 regression checks including seven adapter checks, inline-script identity/syntax, controller IDs and navigation consistency. User Verified: none for this reconstruction; previous formal visual appearance was expressly rejected. Not Verified: physical phone keyboard/call/media and signed-in end-to-end visual acceptance. Browser/Pages checks accompany publication; do not equate automated checks with 1:1 customer screenshot acceptance. Functional roadmap remains paused for the requested visual work.

Browser follow-up to reconstruction: read-only fixture rendering exposed Host #hostName styles leaking into Chat (white/22px rather than dark/13px), and Send still nested inside the legacy pill. Fixed Host selector scoping and moved Send outside the pill; static Chat back/more/smile and Home rail paths now match the same reference SVG source. Fixture artwork paths made absolute to avoid custom-property URL resolution against the root stylesheet. Desktop composition capped to the reviewed 393×780 frame; mobile remains viewport sized. Inline controllers remain identical. New user acceptance is still pending; browser fixture checks are synthetic visual evidence, not a signed-in phone workflow.

Final browser follow-up: corrected inherited absolute positioning on the relocated Host Follow control, Settings title margin, and the malformed Call root selector that exposed the cream background. Call controls now use the reference row gap. Outer Plaza category/heart/comment paths also use the exact reference SVG system; player nodes/callbacks are retained. Targeted checks pass; physical acceptance remains pending.


## 2026-10-13 Malaysia — Continued reference geometry review
Home follow controls still inherited four grid columns and 39px icon wrappers from the legacy inline stylesheet. Override with a single 25px circular control at the reviewed right/bottom 8px offsets and a 15px SVG, with the reviewed filled pink following state. Existing button nodes and follow callbacks are unchanged. Shared stylesheet consumer cache versions updated; no customer-data/database/call changes. Automated and public browser checks accompany release; physical phone and full reference acceptance remain pending.


## 2026-10-15 Malaysia — Transparent Home title
Owner requests removing the black rectangle behind the Mimo lettering. The existing source artwork and 108×36 title geometry are retained; an SVG luminance-to-alpha filter on the cropped artwork removes its dark backing so the real header background shows through. Removed parent contrast/blending that created an opaque black rectangle. Home stylesheet cache refreshed. No functional/data changes; browser verification accompanies publication.


## 2026-10-15 — Approved dark theme production activation
Owner approved the separate image design and explicitly requested immediate publication. Native DOM adaptation activates dark purple/rose presentation on ten formal pages, four-tab navigation, illustrated Home shortcuts and the supplied voice/letter entries. Real identities/messages/balances and existing handlers are retained. Call has one five-control video row (flip/mute/hang up/local black/More); More contains gifts/effects/beauty/audio/report. Local black only covers the received video and never disables outgoing tracks or sends a signal. Existing RTC/Beauty inline scripts are unchanged.

The accepted image prototype and native production rendering are distinct: no pixel-identical or physical-device acceptance claim. Voice introductions, daily letters, effects, unconfigured ranks/VIP benefits and gift settlement explicitly remain unavailable rather than supplying fictional business data. Audio hardware routing uses the device controls; no simulated Bluetooth/earpiece route. Report submits to the existing authenticated support endpoint only after explicit submit. No database/payment/customer-data mutation for release or tests.

Automated: 311 regression tests passed before final CSS specificity/placement correction; final verification accompanies release. Browser fixtures cover Home/Chat/video More and exposed legacy CSS specificity and native dialog default-margin issues, corrected before activation. Signed-in device calling, phone keyboard and user acceptance of native rendering remain pending. Prep assets/code shipped in PR71 without activating the formal root pages. Rollback activation by reverting the release PR; old inline controllers remain intact.


## 2026-10-15 — Owner-supplied HD ranking banner
Replace only the Home ranking artwork with the owner-supplied 1986×792 image, encoded as full-resolution quality-95 WebP for transfer. Preserve the entire composition and native aspect ratio without cropping or stretching; keep the existing ranking link. Home stylesheet cache refreshed. No controller/media/backend changes. Source upload remains untouched.


## 2026-10-15 — HD Home shortcut and discovery cards
Owner rejects the blurred low-resolution Home shortcut/discovery crops and supplies a new HD six-card board. Replace the four shortcut assets and two discovery-entry assets with individually extracted high-resolution cards from that supplied board, preserving embedded lettering and native proportions. Existing links unchanged; no new functional/backend changes. Refresh Home CSS/adapter versions. Source upload untouched.


## 2026-10-15 — Remove obstructing Home shield shortcut
Owner requests fixing the oversized top-right shield that covers the banner. Remove only the extra Home support link added by the theme adapter; keep existing search and notifications. Settings → Help & Customer Service remains available. Refresh Home adapter cache. No other layout, call or backend changes.


## 2026-10-15 — Reference-based native Help & Support redesign
Owner requests replacing the plain support page with the supplied three-screen dark pink/purple reference. Add a native dashboard (supplied decorative headset portrait, three routes, searchable FAQ), native category/form view, real-ticket status filters and styled ticket details/replies. Preserve all existing form/controller IDs, authenticated support RPCs, photo limit, idempotent retry and admin scope/status/priority controls. Original inline support controller remains byte-identical.

No fake ticket IDs, amounts, online staffing or service hours are shown on real accounts. Contact routes to asynchronous tickets; status filters use actual open/in_progress/resolved/closed values rather than pretending resolved means replied. Existing single-photo/4000-character limits remain. No backend, payment, customer-data or call changes. Browser and automated checks accompany release; original reference acceptance does not establish signed-in native phone acceptance.


## 2026-10-15 — Home header spacing, country pill and centered MiMo
Owner requests more space above Home content, a flag/country pill matching reference 2, and a centered handwritten glowing MiMo mark similar to reference 3. Increase header from 43px to 78px; retain all lower content and control callbacks. Replace platform-dependent emoji with a vector Malaysia flag and add a transparent vector wordmark. Native SVG assets remain sharp and contain no background rectangle. Existing region explanation, search and notification routes unchanged; no other page/controller/backend changes.


## 2026-10-15 — Restore Settings logout control
Owner reports the logout button missing below the settings menu. Restore a visible 登出 button at that location, wired directly to the existing logout() function (push cleanup → Supabase signOut → login redirect). No auth/controller logic changes. Add matching nonfunctional control to the labeled visual fixture. No actual customer session signed out during verification.


## 2026-10-15 — Plaza/Home signature, native Plaza header and role-aware shared navigation
Owner supplies the Plaza phone mockup and requests its champagne Mimo-heart signature on Home, no simulated phone time/notch/network/battery, no left search, only right search/notifications, four shared navigation destinations without a notification tab, and a Host-only center +. Add native Plaza header and local loaded-post search; preserve original feed/player nodes and handlers. The existing four equal Player tabs remain; all six shared-nav pages add a center publish route only after authenticated own-profile role=host. Admin/User/unknown/logged-out roles get no reserved center gap. Session changes clear the shortcut immediately and reject stale profile reads. Host + opens the original guarded composer; other pages route to Plaza compose. Existing server Host-only publish rules remain unchanged. No real posts/messages/customer data created to verify. Existing inline controllers unchanged. The champagne signature preserves the supplied mark’s actual letterforms in a cropped lossless WebP with the dark backing made transparent; no replacement typeface.

Validation for this batch: 317 regression checks pass, including four new shared-navigation/Plaza UI tests and the existing PostgreSQL Host-only publishing rules. Default Player navigation has four equal destinations; Host shortcut is inserted between Plaza and Messages with no persistent empty slot. Physical phone/authenticated-device acceptance remains pending.


## 2026-10-15 — Bottom button appearance corrected to owner reference
Owner clarifies that matching navigation layout/roles was insufficient: buttons must visually follow the supplied mockup. Replace the shared static icons on all six formal destinations and current visual fixtures with the reference-shaped Home outline, Saturn/planet Plaza, round dotted chat and profile outline. Use near-white inactive controls, pink active glow/filled planet, flat dark footer with a thin rose top line, and the reference-like rose circular Host + with an SVG cross. Player four equal columns and Host-only five-column behavior remain unchanged. No auth, publishing, other controls or backend changes. This is a native vector reconstruction; do not call pixel-identical phone acceptance verified.


## 2026-10-16 Malaysia — Filled navigation icon palette
Owner requests filling the blank interiors of the other three bottom icons and delegates color choice. Add subtle vertical SVG gradients: champagne Home, existing rose-pink Saturn Plaza, lavender Messages with dark readable dots, and dusty-rose profile. All four remain colored when inactive; selected state retains the existing pink halo/text distinction. Apply identical SVG definitions and fills to all six formal nav destinations and current visual fixtures. Icon shapes, footer geometry, links and Player/Host role behavior are unchanged. No scripts/backend changes. Automated and browser checks accompany release; phone/user appearance acceptance remains pending.


## 2026-10-16 Malaysia — Me blank-loading interruption
Owner recording shows repeated full-page “Loading your profile…” interruptions on Me navigation. Source confirmed the entire page was hidden until sequential getUser → profile → wallet (including another getUser) → VIP completed. Render the final native Me shell and menus directly in HTML, before the Supabase SDK at the bottom; preload SDK without blocking the head. Load independent profile/wallet/VIP reads concurrently after verified identity. Use neutral placeholders, no fabricated avatar/zero balance, no whole-page loading gate. Display recoverable inline errors; clear identity and reject stale reads on logout/account change/pagehide. Existing account guard and exact wallet balance semantics remain. Static Me document is prefetched from the five other main-nav pages. Adapter skips rebuilding already-rendered Me menus; older visual fixtures retain their existing decoration path. No schema/RLS/call changes and no personal-data cache. Automated delayed-read/race tests and public browser fixture verification accompany release; zero network latency and physical-device smoothness are not claimed.


## 2026-10-16 Malaysia — Four retained main destinations
Owner rejects repeated content loading across all tabs, beyond the earlier Me loader fix. Add `mimo-tabs.js`: after verified identity, the outer main page retains its own DOM and warms at most three isolated same-origin main-page documents (Home/Plaza/Messages/Me). Footer switches reuse the same documents, loaded rows, scroll and drafts; browser Back/Forward tracks the selected destination. Initial destination data readiness precedes first activation, so the current content stays visible rather than showing an empty replacement. No iframe controller globals are injected/shared, no private data is persisted to disk. Unverified/failed auth keeps standard navigation. Login/account changes destroy all retained pages and reload hidden outer content; pending responses cannot reopen them. Non-tab links exit to the top-level page; Home call/profile and Me programmatic routes explicitly use top-level navigation, preserving a single call flow without touching call.html. Root incoming-call overlay remains interactive above tabs. Only the outer document runs foreground notification delivery. Hidden tabs pause media and feed playback cannot restart until active; hidden Plaza/Inbox polling skips work. Host-only + remains the original guarded behavior.
Home host reads run alongside identity/follow reads; Plaza role/feed reads overlap after verified UID. Existing data stays visible during feed refresh. These are app navigation/performance changes, not zero-network-latency guarantees or user/device acceptance. Labeled read-only `neon-review/tabs/` fixtures exercise the real runtime. Delayed-read, retained DOM/draft/scroll, auth isolation, navigation and inactive-video regression checks accompany release. No database, RLS, wallet semantics, RTC/Beauty or call.html changes. Main-tab state is lost on a full reload or leaving this four-tab session.


## 2026-10-16 Malaysia — Unresponsive footer correction
Owner reports buttons cannot be clicked after the retained-tab release. Source inspection confirms a blocking failure mode: navigate consumed a click while waiting indefinitely for MimoPageDataReady, which depends on asynchronous controller initialization. Remove data-readiness gating from the navigation contract. A destination is usable when its document has loaded and its actual shared navigation exists; data continues independently. If its document is not yet loaded, return false so the original anchor immediately performs normal navigation (top-level for embedded pages). Never swallow a click awaiting a network result. Preserve reuse for already-loaded pages. Cache version tabs2 replaces the previous handler. Regression covers unready clicks not prevented and loaded destinations functioning without a data-ready event. This identifies and fixes a concrete failure mode, not verified attribution of every user-reported button failure.


## 2026-10-16 Malaysia — Me identity lost on initial SIGNED_IN
Owner's 01:44 recording shows a persistent placeholder avatar/name and Unavailable balance while other authenticated pages work. Reproduced exactly in the real Me controller test: an initial SIGNED_IN for the SAME user before getUser resolves invalidated meEpoch and cancelled all profile initialization without restarting. Remove that mistaken first-event account-switch branch; compare the verified user against the latest observed auth identity before applying results. Repeated same-user SIGNED_IN preserves profile/avatar/balance. Genuine identity changes still immediately clear values and invalidate in-flight reads; a new authenticated account schedules reinitialization outside the SDK callback, cancelled on pagehide. Add a username fallback for absent display_name. No database/customer-record changes, no removal of logout protection. Regression first fails on previous controller and passes with this correction; production phone acceptance remains pending.
Retained frames now request a release-versioned HTML URL (tabs3), so a refreshed outer page cannot silently reuse a previously cached defective Me document. Root URLs/history and destination matching retain their existing behavior.


## 2026-10-16 Malaysia — Settings back link and received-like count
Owner requests a top-left Settings return control and numeric received likes, including 0 when none. Replace the deliberately hidden legacy Settings back button with a visible, accessible native chevron link to Me, usable even when Settings was opened directly. Add its styling to Settings and its labeled fixture. Extend existing verified-user counts with an exact HEAD count of post_likes joined to posts and filtered by posts.author_id = own verified ID. This counts likes received on the account's posts, not likes the account gave. A successful empty count renders 0; failures or unavailable identity retain the unknown marker rather than fabricate zero. Existing logout/race guards also cover the new count. No schema/RLS or customer records changed. Bump affected adapter and retained-document versions. Automated zero/nonzero/error/logout checks and browser checks accompany release; real-account acceptance remains pending.

Browser follow-up: the inherited Settings header display override placed the return chevron above the title. Add a final scoped flex-row header rule after shared styles, keeping arrow/title on one line without moving lower Settings content.

## 2026-10-16 Malaysia — Independent personal-profile design preview
Owner requests the profile editor from the supplied video be recreated from their 18-panel reference collage, with a browsable preview before deciding on formal release. Add only `profile-preview/`: crisp native Chinese controls, reference-derived portrait/decorative art, nickname/bio/job editing, birthday/zodiac, education, avatar picker, four MBTI groups and seven tag selectors. Desktop phone frame and mobile viewport; all 18 reference states available through a preview index. Sample edits stay in memory, with no authentication, backend writes or customer-data storage. Existing Me/Settings/profile links remain untouched. The independent preview URL may be published for review; do not activate it in the formal account flow without the owner's decision. Automated checks cover save/cancel, all 18 states, confirmed MBTI/tag choices and birthday/education changes. Native reconstruction from a raster reference; pixel-identical/device acceptance is not claimed.

## 2026-10-16 Malaysia — Preview Save and adjustable avatar
Owner requests an explicit Save button and control over avatar photo size and angle. Keep work isolated to profile-preview: add a fixed 保存资料 action with an honest preview-only confirmation, label field actions 保存, and insert a local avatar crop editor before applying an uploaded photo. Supports mouse/touch drag, two-finger zoom, zoom slider, -180°…180° rotation, keyboard positioning and reset. Rotated-image bounds are clamped in image coordinates so the crop stays filled. Confirm exports an actual 640px square JPEG (shown as a circle); cancel keeps the existing avatar. No raw photo or profile writes are sent to any backend. Revoke source object URLs on replacement/pagehide and ignore stale image decoding after navigation. Formal profile activation still awaits owner's decision. Regression includes canvas pixel coverage for rotated portrait/landscape crops and cancel/confirm behavior.

## 2026-10-16 Malaysia — Reference artwork, real preview completeness and gender
Owner supplies new career, zodiac and MBTI art and requests six preview changes. Keep formal account flow untouched. Career uses the exact supplied art with a feathered CSS mask and screen blend so no rectangular tile edge appears. Start preview fields empty; completeness is the actual confirmed-filled count / 16 independent fields (avatar, nickname, bio, gender, birthday, region, education, occupation, MBTI and seven tag groups), with no separate count for derived zodiac. No account/backend completion is claimed by this isolated preview. Replace the main Birthday row with gender; birthday remains inside 星座与生日. Zodiac illustration selects all 12 signs by birth month/day, male/female by confirmed gender (unset defaults male), and separate Chinese/English source cards by preview language. Add an external preview language selector and document-lang/custom-event hook, without installing a formal language system. Use reference 9 portraits in the exact owner groups NT INTJ/INTP/ENTJ/ENTP; NF INFJ/INFP/ENFJ/ENFP; SJ ISTJ/ISFJ/ESTJ/ESFJ; SP ISTP/ISFP/ESTP/ESFP. Preserve all reference card artwork/text via clipped source sheets; gender also chooses its MBTI portrait half. Avatar zoom now permits shrink to 10%, free positioning/rotation and a 显示完整原图 control; uncovered area is a consistent dark matte and remains in the confirmed JPEG. This supersedes the prior fill-only crop constraint. Tests cover completeness increase/decrease/cancel, gender+language+date asset selection, all twelve sign mappings, all sixteen MBTI group placements and shrink output. New native source sheets are derived only from supplied attachments, not regenerated illustrations.

## 2026-10-16 Malaysia — Owner-marked artwork layout corrections
Owner marks only the extra career-page sparkle for removal, the tiny zodiac card/unused lower region, and MBTI art with gaps/partial clipping. Hide only the occupation screen's generated pseudo-element sparkle; preserve stars within supplied artwork and other screens. Display the complete zodiac source card at full content width with metadata below, retaining its intrinsic ratio and normal content scrolling; apply consistently to all 12 signs, both genders and both image languages. Extract each of the 32 MBTI cards from the owner's unchanged source sheet into its own self-contained SVG/WebP asset. Each uses the entire source card, fills its card frame from edge to edge, and retains the existing group/gender/code mapping. No new art, text edits, other page/controller or formal account changes. Preview remains unactivated in formal navigation.


## 2026-10-16 Malaysia — Interrupted-session recovery and bounded zodiac artwork
Recovered main at 82bb6a6 (PR #96), checked recent commits and the complete handover. Latest active work is the isolated profile-preview artwork, not the functional roadmap. The existing live preview stylesheet matches recovered main. No local uncommitted predecessor work exists in this new checkout; unpushed work in the old session cannot be established.
The owner's final 07:01 recording and request were newer than the last handover entry: complete zodiac artwork must fit between the date selector and Save without scrolling. The prior full-width/intrinsic-height layout intentionally scrolled and is superseded. Keep the birthday content within its viewport, assign the remaining height to a proportional SVG card viewport, and clip the original sheet to the selected card in a nested SVG so adjacent cards cannot appear in the letterboxed space. Keep all 12 signs, gender/language selection, original images and Save behavior. Compact metadata below the art; no formal account activation, backend or other product/controller changes.
Verified locally: all 10 existing profile-preview interaction/Canvas tests plus JS syntax and diff checks pass. A local Chromium installation failed (invalid download archive); no local browser geometry or physical-phone acceptance is claimed. Browser/release follow-up remains required before treating the new fit as visually verified. Preview publication/merge status must be checked against this change's branch; this paragraph alone does not establish deployment.
