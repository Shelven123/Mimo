# Mimo Master Handover

Current checkpoint: Beauty Engine v2.6. This document is the canonical handover for ChatGPT Work.

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
CURRENT V2.6: ec7119ec881b35469c4e073ba0bd6c5f1f650134 adaptive iPhone processing width/performance; 6ac7788ade61d355874b0a4a2f6602b3b41015dc UI.

## Verification matrix
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

## Next steps
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
