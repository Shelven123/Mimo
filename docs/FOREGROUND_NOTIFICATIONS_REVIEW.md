# Foreground notification review — 2026-10-12

## Behavior and scope

Authenticated pages load a shared, scoped banner module using their existing Supabase client. Normal browser use requires neither installation nor a system notification permission request. New own notifications appear as a dismissible link with generic preview text while the page is visible. Category preferences and two local device choices apply. Generated low-volume audio requires a trusted page interaction first; no old sounds are replayed. Calls retain their existing UI; the active chat peer and Home incoming-call overlay suppress duplicate foreground notices. Playing audible media and recording suppress chimes without pausing players. Call and Beauty preview pages are excluded.

The initial successful snapshot and return from background silently establish history, not replay it. Realtime listens to owner-filtered notification INSERT/UPDATE; visible polling every 15 seconds supplies a fallback over the latest 100 rows. Seen IDs have bounded local persistence, without message content. Queued banners are bounded at three and dismissed after 6.5 seconds. Read updates dismiss matching banners. Logout/account change/navigation dispose listeners, audio, channel and UI. Native push registration is checked against both the local subscription and own backend row; confirmed native push avoids a second foreground banner/chime. This is best-effort deduplication, not an exactly-once guarantee across tabs or network races.

## Authorization and deployment

Managed migration `20261012012933_mimo_foreground_notifications_realtime.sql` adds public.notifications to the existing supabase_realtime publication idempotently. Production metadata confirms membership and enabled RLS; own SELECT and UPDATE policies remain user_id = auth.uid(). No client grants, write policies, notification producers or customer data changed. The UI uses textContent and validates UUID destinations, falling back to Notifications. No private body is placed on the banner. No service secret is introduced.

## Verification status

Implemented: banners, sound, settings, category rules, native push deduplication, cleanup and realtime/polling integration on 18 authenticated pages.

Automated Verified: 263 regression checks, including seven focused DOM tests for initial history, safe links/text, fresh rows, settings/read state, native subscription, hidden/chat/call suppression, media continuity, account cleanup and stale preference responses. Production publication/RLS metadata verified. JavaScript and changed HTML inline scripts checked before release.

User Verified: earlier support submissions and followed-Host in-app notification generation only. No user acceptance yet for this foreground presentation.

Not Verified: physical iPhone banner appearance/audio, actual two-account realtime delivery, provider/system push and interaction with Safari keyboard/browser chrome. Browser DOM tests do not establish physical-device acceptance.

## Limits and rollback

Only visible open Mimo pages receive this optional presentation. Closed pages, background tabs and lock screens need native system push; iPhone system push still requires Home Screen installation. Sound depends on browser gesture/autoplay policy and is suppressed during audible media/recording. Polling may omit bursts beyond 100 latest rows; bounded queue intentionally avoids a flood. Multi-tab seen persistence is best effort. Existing notification creation authorization applies; this module does not independently recheck a block changed after a row was created. Startup authentication failure needs a reload. Turning off banners clears presentation without deleting notification history.

Rollback frontend asset includes and local settings card, or disable local banner/sound switches. To remove realtime delivery, remove only public.notifications from the publication; existing polling/history and other published tables remain intact. Do not drop notifications or alter working call/Beauty code.
