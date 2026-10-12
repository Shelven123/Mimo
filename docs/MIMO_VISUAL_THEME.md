# Rose & Champagne theme — 2026-10-12

Owner paused feature development and requested the supplied romantic pink/champagne reference. Implemented shared versioned mimo-theme.css on 22 product pages, excluding the internal Beauty regression preview. Deep rose Home/Host profile/call waiting palette, cream/pink messaging/settings/notifications, warm cards, borders and gradients, line navigation icons, scoped Reels accent colors and themed existing controls. Home hero uses an existing visible Host avatar and hides the image if none is available; no fabricated people/stats/verification badges are added.

Presentation selectors use data-mimo-page and load after existing styles. Call/Beauty inline scripts are byte-identical to the previous commit. Chat/keyboard/scroll viewport variables, player positions, media image/video/canvas pixels and auth/permission/data flows are retained. No new animation loop, media filters, dependency, schema or customer write introduced. Navigation handlers/labels/routes remain the existing ones. Home logic adds only the selected visible photo and styling.

Automated Verified: 296 regression checks, 23 inline scripts, call/Beauty script identity and diff checks. Deployment exact-file checks recorded in the PR. User Verified: none for this theme. Not Verified: actual phone/browser rendering, contrast under every overlay, native keyboard/media state and visual match acceptance. DOM checks do not establish pixel-perfect device appearance. The reference is a direction, not a claim of exact screenshot reproduction.

Rollback: revert theme link/body markers, Home hero/branding and static nav SVG substitutions; remove shared theme file. Existing base styles remain intact. Functional roadmap is paused until the owner resumes it.
