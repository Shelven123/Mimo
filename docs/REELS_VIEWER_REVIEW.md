# Immersive Plaza Reels — 2026-10-11

Implemented: outer Plaza video continues muted autoplay. Sound button toggles audio without navigation; tapping its picture enters an immersive Reels dialog. Full-height scroll-snap cards, vertical gestures and arrow keys select one video at a time; near the end another server page loads, with retry on failure. Back returns to Plaza. Opening carries the selected video's position and sound choice when metadata is ready. Browser policy may still require a Play tap. Each next video defaults muted. Existing like/comment/repost/share/save/gift controls are reused. Current media nodes remain connected on like/comment refresh.

Following appears on Plaza and at the top of Reels. `mimo_plaza_feed_v3` now adds an own-follows EXISTS filter before ordering and pagination, using `(follower_id,following_id)` primary-key index. This preserves SECURITY INVOKER, empty search_path, auth guard, block/visibility RLS and existing all/saved/reposted/media filters. No table/RLS/content edits. Production migration `20261011060905_mimo_following_reels.sql` applied; live metadata verified invoker/STABLE/empty search_path/authenticated-only execute/own-follow filter/no-auth zero rows. Before/after security and performance advisors identical (pre-existing findings remain). Rollback function provided; roll frontend back first.

Verified: 198 automated checks pass. Actual Plaza interactions with viewer loaded cover outside sound/picture entry, carried time/sound and retained full-screen player after likes/comments. Independent tests cover scoped visibility root, pagination/deduplication, mode changes/late promises/retry/empty following, block removal, logout/close cleanup. Isolated PostgreSQL checks follow/unfollow, other account, block, no-auth and anonymous denial. JS/inline syntax and whitespace pass.

User Verified: user accepted previous muted-autoplay release before this request.
Not Verified: this release's real-phone swipe/snap, native-dialog visual appearance, fullscreen audio transfer under browser policy, production signed media/network loading and real-account Following acceptance. The supplied Instagram recording is a behavioral/layout reference; no Instagram assets or APIs used. No call/Beauty/payment changes.

## Entry audio and manual pause — 2026-10-11 follow-up

Implemented: explicit video-picture entry requests playback with sound synchronously inside the click gesture, using the existing signed source when available and carrying its position. Sound button toggles mute; viewer picture and a dedicated Pause/Resume button toggle playback. Viewer mute preference carries to the next Reel; every new entry starts with sound. Outer Plaza remains muted by default. Manual pause survives source readiness, metadata, social refresh, late play completion and background re-entry. Adopted signed sources retain resolver renewal/session cleanup; superseded signing cannot reset an entry, late renewal cannot replace a now-playing video, and paused renewal restores its position.
Verified: 201 automatic tests, including muted-to-audible gesture entry, pause/resume/mute and delayed-media races, signed-source adoption/renewal, plus prior actual-page like/comment continuity. Syntax/diff checks pass. No database change.
Not Verified: this follow-up on physical Safari/Android. Browser audio policy may still require the retained Play fallback; this is not a claim of real-phone acceptance.

## Center controls, hold and seeking — 2026-10-11 follow-up

Implemented: viewer Pause/Resume control is centered, subdued while playing and prominent while paused. Holding picture/center control for 200 ms pauses temporarily; release resumes only if previously playing and still active. Manual pause stays paused. Vertical movement cancels the hold so scroll-snap remains native; generated release clicks are suppressed once, context menus suppressed only on the player/control. No resume after leaving view, hiding or disposal. Viewer timeline provides a native accessible range slider with 0.1-second seeking and m:ss / duration; keyboard seeking supported, unknown duration disables range. Seeking preserves manual pause. Controls survive keyed social refresh and clean listeners/timers/DOM on removal.
Verified: 205 automated checks including hold/release, metadata while holding, manual pause, vertical drag, pointer cancellation, offscreen/disposal and timeline seeking/time/invalid duration; actual Plaza/Reels continuity now loads the controls module. Syntax/diff checks pass.
Not Verified: physical phone center-button appearance, touch hold/swipe, native range dragging and streamed seek latency. No DB/call/Beauty changes. Outer Plaza behavior retained.

## Center icon correction
Reference-style rounded white SVG play triangle on dark circle; center button fully hidden while playing, shown paused. Picture gestures and timeline retained. 206 checks pass including visibility transitions. Physical-phone appearance pending.

### Centered tabs and visible-video comments (2026-10-11)
Implemented: centered tabs, compact real follow control, bottom comment entry, dark existing comment composer under the same reduced player. Follow writes require existing privacy/block permission and verify persisted state. Errors show Retry; logout/closed-generation responses cannot restore private rows. Comments pin the selected video across resize and social refresh; closing restores its feed position. Outside-Reels comments keep their modal behavior.

Automated verification: 209 full-suite checks including shared follow state/retry/late logout response, nonfirst Reel shrinking, unchanged player/time/sound and nested Escape behavior. Physical Safari keyboard layout, live-account follow and comment submission still need phone acceptance.
