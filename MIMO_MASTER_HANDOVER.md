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
