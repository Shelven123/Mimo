# Mobile layout and accidental scaling protection

Shared mobile-layout.css/js is included on 19 ordinary pages, including home, Plaza, inbox/chat, login/profile, settings, wallet/recharge/support/uploads. Existing call.html and Beauty previews remain untouched.

Touch-device rules allow horizontal/vertical panning without opting into page pinch zoom, keep text/select fields at 16px and constrain overscroll in message/comment lists. Non-cancelable events and non-touch devices are ignored by JS; ordinary one-finger scroll/tap, typing and desktop controls retain default handling. Only multi-touch start/move and Safari gesture start/change are prevented when cancelable on coarse-pointer devices. Pagehide/persisted pageshow/disposal manage listener lifetime without duplication. No body-wide scroll lock is added to normal feeds/forms. Existing more-specific voice hold, Reel seek and comment handle rules remain.

Chat input and ordinary Plaza comment field previously used 13px, now 16px. Chat/Reels comment viewport handlers ignore visualViewport scale changes, retaining previous geometry until normal-scale updates resume. Keyboard changes at scale 1 still reserve room for the composer. Existing independent chat/comments list scrolling and Reels preview geometry preserved.

References: [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action), [multi-touch handling](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Multi-touch_interaction), [Safari scaling behavior](https://webkit.org/blog/7367/new-interaction-behaviors-in-ios-10/). Browser zoom/accessibility overrides and native fullscreen surfaces remain outside a guaranteed web-app lock.

Verified: 232 automated checks; cancelable multi-touch restriction, single-touch/click/desktop pass-through, page lifecycle/disposal, actual chat viewport/draft/list preservation, field font/excluded slider sizing and strengthened Reels scale/player/position/scroll assertions. JS syntax, inline syntax for all 19 changed HTML pages and diff checks pass. DOM/event mocks are not physical Safari rendering tests.

Not Verified: actual iPhone/Android pinch/double-tap/focus/keyboard/browser-chrome behavior and native controls. Prior Reels keyboard scrolling remains pending explicit phone acceptance. No DB, call or Beauty changes.
