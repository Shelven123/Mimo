# Four-screen visual reconstruction — work in progress

Owner rejected PR61's broad recoloring and requests the exact four supplied compositions. Functional roadmap remains paused. Reference order: Home, Host profile, Plaza, Chat.

## Current candidate

- Home: full-width reference campaign cover, glass discovery rail, horizontal real Host cards, gift artwork strip, secondary real Host tiles and luminous navigation.
- Host: live identity and bio overlaying the actual public Host portrait, gallery below tabs, guarded voice/video controls, tag pills and three-column actual detail tiles.
- Plaza: two-column flow with compact author/media/actions, author strip derived only from the currently visible feed. Existing keyed videos and social handlers retained.
- Chat: reference portrait backdrop, transparent incoming bubbles, hot pink outgoing bubbles and glass composer. Current recording/edit/recall, private media, account cleanup and keyboard controller remain.

Reference PNGs remain unmodified. CSS crops a campaign region and clean photo region; **this is not an editable source-art extraction**, and rasterized text/icons cannot independently respond to layout. No fake Host account, age, follower count, review, price, VIP badge or message was inserted into production. Reference sample data does not override real account content.

## Known differences / not complete

This candidate is NOT a pixel-perfect replica and is NOT approved for replacing the live release. Host portrait, actual names/counts/content remain real and therefore differ from the examples. The original unoverlaid portrait/background/icon assets and font source are not available. Exact reference spacing/icons, original five-tab Host structure, gift wall and sample content are not finished. No screenshot-based browser/mobile acceptance has been achieved. The user expressly rejected the preceding theme; do not mark it User Verified.

Needed to satisfy strict identical-artwork requirements: original full-resolution covers/portraits, backgrounds without UI/text, original logo/icon assets and font files or editable Figma/design exports. Complete reference screenshots are retained as measurement benchmarks. Do not simulate functional completion by using an entire screenshot as the app.

## Safety / verification

Call and Beauty source are untouched. No Supabase migration, role/permission, wallet/payment or customer writes. Adapter buttons cannot bypass existing call denial; late permission results after page exit cannot navigate. Feed-derived author avatars clear when feed clears. Two focused DOM regression tests check these behaviors; all 296 existing tests pass. Inline JavaScript, unique IDs, shared adapter syntax and whitespace are checked. These checks do not establish visual fidelity, physical Safari keyboard stability, real media or real-account end-to-end acceptance.
