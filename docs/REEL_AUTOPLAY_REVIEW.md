# Plaza muted autoplay — 2026-10-11

Implemented: feed-only visibility controller selects one video at a time (at least 50% visible within the header/navigation inset), loops it muted, and pauses/mutes it when it leaves view. Tap its picture or the compact Sound button to toggle audio. Each newly active video starts muted. Likes/comments retain the same player, playback time and sound choice. Comments/share sheets do not suspend the feed. Hidden pages, logout, native Reel selection and detail previews suspend feed playback. Composer previews retain existing controls. Source readiness retries initial playback; rejected autoplay offers a Play button. Browsers without IntersectionObserver retain native video controls and muted defaults.

Verified: automated DOM tests cover visibility selection, explicit sound gesture, retained time, background, picker, external player, source readiness, removal, session expiry, rejected/late play promises and unsupported-observer fallback. Existing upload, opening-cover, duration and uninterrupted-like/comment suites remain passing. These are logic tests, not physical device playback acceptance.

Not Verified: real iPhone/Safari and Android scrolling, audio gestures, low-power/autoplay settings and streamed production files. Browser policy can deny playback; manual Play remains available. No call/Beauty changes, database changes or customer-media mutations.

Policy references: https://webkit.org/blog/6784/new-video-policies-for-ios/ and https://developer.chrome.com/blog/autoplay/ .
