# Comparison-driven interface correction

The owner rejected the first promotion because it kept old visible structures. The 16 comparison images pair the existing live page (first) with the approved second-preview appearance (second). The owner explicitly requests replacing old buttons/layout, with later product refinements handled separately. Target screens: Chat, Inbox, Host, Plaza, Notifications, Me, Settings, Call; Home navigation/artwork is coordinated.

Implemented:
- Use the reviewed 393px composition, cream/dark colors and identical SVG paths. Remove old global-theme overrides. Desktop no longer stretches social/chat views to 633–900px.
- Inbox has the reference title and search icon; old quick chats/filter heading are absent. Search input opens only on action.
- Chat has the reference three small profile/call shortcuts, cream background, compact bubbles, dark composer, sound/photo/gift/paper-plane icons. Photo delegates the existing permitted picker; gift cannot settle. Existing recording, recall/edit and failed-draft recovery remain.
- Host has the gallery/stat/call/tabs structure; old greeting/action bar is not visible. Follow/chat occupy the reference post-heading positions. Working controller targets remain.
- Plaza has compact album strips/cards, revised category/tabs and heart/comment/ellipsis action row. Extra old gift/share controls are not visible. More delegates the existing post menu. Latest/Hot operate on real loaded-row ordering; hot is not a global popularity ranking. Daily/Mood are explicitly pending categorization.
- Notifications use compact rows and category pills, preserving explicit own reads/direct links. Unsupported names/avatars/thumbnails are not invented.
- Me/Settings have the reference menu structures; real identity and visible RLS counts populate existing positions. Unavailable statistics stay —. Watch history/subscriptions/language/theme/cache/about need subsequent functionality; no fictitious 12.8 MB or account certification is displayed.
- Call uses the same SVG icons, control spacing and dark composition; earpiece remains absent. Old Beauty/Flip controls are not visible in this composition, but their underlying functions/processing remain. Three main video controls plus hangup; existing main/PiP roles still swap. Actual RTC/call preference/Beauty inline scripts remain byte-identical.

No database/RLS/payment/customer-content changes. Reference artwork uses existing owner-approved public assets. User avatar/post media/name values remain real rather than assigning demo portraits/messages/counters/prices to customer records. Public `replica-review/` is a clearly labeled, read-only sample for visual geometry checks, without auth, recording, sending or real call scripts; never treat its sample content as actual customer state.

Verification: regression suite, seven new adapter tests (including late-account cleanup), inline-script identity/syntax, unique IDs/navigation, public browser rendering and exact Pages bytes. Visual QA is separate from automated checks. The owner rejected previous production visual acceptance; no new User Verified checkpoint until explicit feedback. This release does not claim pixel identity of customer content versus synthetic samples or physical-device acceptance.

Rollback: revert this release's HTML, two renderer metadata additions, new stylesheet/adapter and review directory. Core DB/media/Beauty code stays in place. Original controls/functions are retained in source; returning to the old presentation restores their old visible entries.
