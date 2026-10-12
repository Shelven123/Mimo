# Foreground notification review — 2026-10-12

## Behavior and scope

Authenticated pages load a shared, scoped banner module using their existing Supabase client. Normal browser use requires neither installation nor a system notification permission request. New own notifications appear as a dismissible link with generic preview text while the page is visible. Category preferences and two local device choices apply. A self-contained PCM WAV media chime requires a trusted page interaction first; no old sounds are replayed. Capture-phase click/touchend/keyboard gestures silently unlock a dedicated reusable audio element. A Test sound button and blocked-banner Enable sound action provide explicit audible retries. Playback success text reports that playback started, not that the speaker was heard. No global audio-session type is changed. Calls retain their existing UI; the active chat peer and Home incoming-call overlay suppress duplicate foreground notices. Playing audible media and recording suppress chimes without pausing players. Call and Beauty preview pages are excluded.

The initial successful snapshot and return from background silently establish history, not replay it. Realtime listens to owner-filtered notification INSERT/UPDATE; visible polling every 15 seconds supplies a fallback over the latest 100 rows. Seen IDs have bounded local persistence, without message content. Queued banners are bounded at three and dismissed after 6.5 seconds. Read updates dismiss matching banners. Logout/account change/navigation dispose listeners, audio, channel and UI. Native push registration is checked against both the local subscription and own backend row; confirmed native push avoids a second foreground banner/chime. This is best-effort deduplication, not an exactly-once guarantee across tabs or network races.

## Authorization and deployment

Managed migration `20261012012933_mimo_foreground_notifications_realtime.sql` adds public.notifications to the existing supabase_realtime publication idempotently. Production metadata confirms membership and enabled RLS; own SELECT and UPDATE policies remain user_id = auth.uid(). No client grants, write policies, notification producers or customer data changed. The UI uses textContent and validates UUID destinations, falling back to Notifications. No private body is placed on the banner. No service secret is introduced.

## Verification status

Implemented: banners, sound, settings, category rules, native push deduplication, cleanup and realtime/polling integration on 18 authenticated pages.

Automated Verified: 266 regression checks, including ten focused DOM tests for initial history, safe links/text, fresh rows, settings/read state, native subscription, hidden/chat/call suppression, media continuity, account cleanup, stale preference responses, PCM audio structure, rejected playback retries and late unlock disposal. Production publication/RLS metadata verified. JavaScript and changed HTML inline scripts checked before release.

User Verified: earlier support submissions and followed-Host in-app notification generation only. No user acceptance yet for this foreground presentation.

Not Verified: physical iPhone banner appearance/audio, actual two-account realtime delivery, provider/system push and interaction with Safari keyboard/browser chrome. Browser DOM tests do not establish physical-device acceptance.

## Limits and rollback

Only visible open Mimo pages receive this optional presentation. Closed pages, background tabs and lock screens need native system push; iPhone system push still requires Home Screen installation. Sound depends on browser gesture/autoplay policy, media volume/output and is suppressed during audible media/recording. Returning to the page retains the unlocked element instead of leaving a deliberately suspended AudioContext. HTML media replaces Web Audio, whose ambient iOS mute behavior is documented by [WebKit](https://bugs.webkit.org/show_bug.cgi?id=252746). Browser permission and device audibility still require physical acceptance. Polling may omit bursts beyond 100 latest rows; bounded queue intentionally avoids a flood. Multi-tab seen persistence is best effort. Existing notification creation authorization applies; this module does not independently recheck a block changed after a row was created. Startup authentication failure needs a reload. Turning off banners clears presentation without deleting notification history.

Rollback frontend asset includes and local settings card, or disable local banner/sound switches. To remove realtime delivery, remove only public.notifications from the publication; existing polling/history and other published tables remain intact. Do not drop notifications or alter working call/Beauty code.

## Sound feedback follow-up

User Verified: the foreground notice appears. User report: the previous Web Audio chime was not audible. Do not mark sound as accepted. The original tone was low-gain, page audio only unlocked through bubbling clicks, and hidden pages suspended the context without resuming on visible return. These are confirmed code limitations; the user's exact device cause cannot be determined here. The new media playback path, capture-phase touch handling, explicit test/retry and source-level amplitude address those limitations without changing call/recording audio session behavior. Sound preferences stop ongoing notification playback. Playback failures retain the banner and permit a gesture retry; no claim of speaker audibility is made from play() resolving.

## User acceptance — 2026-10-12 Malaysia 15:23

The owner confirms notice banners appear and the corrected sound works. Mark the tested foreground experience User Verified. Do not infer background/system push or universal device acceptance.
