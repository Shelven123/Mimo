# Beauty v2.7 verification

Run on Node.js 24 using the locked test dependencies:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

Eleven engine tests exercise actual Canvas pixel processing with **fake MediaPipe outputs**. Three JSDOM tests exercise page handlers with **fake camera/auth/engine**. They do not load real models or simulate iPhone Safari. The regression workflow runs relevant PRs and main pushes. Browser visual automation was not performed (browser archive download failed).

## Consolidated iPhone Safari acceptance

Use the unified `beauty-settings.html` page with v2.7 visible. Record device/iOS version and screenshots or video of any failure. Keep a patterned background and even light. Set all sliders to zero and Makeup off before testing each effect separately.

| Check | Expected / what to record | Current state |
| --- | --- | --- |
| Tracking, mirror, camera flip | 478 landmarks, accepted mirror direction unchanged, both cameras work; denied permission can be retried | Historical acceptance; new build not verified |
| Slim Face / Chin / Nose | Compare 0 / 50 / 100; slim face narrows instead of enlarging lower face; chin direction and nose behavior natural | Not Verified |
| Big Eyes only | Compare 0 / 50 / 100; eyes enlarge without changing jaw/chin/nose | Pixel regression Verified; device Not Verified |
| Eye Brightening / Dark Circle | Natural eye and under-eye lift, no visible patch; check tilted head | Not Verified |
| Makeup | Immediate toggle, cheeks/lips follow movement; inspect open mouth | Not Verified |
| Protected smoothing | Compare smoothing off/on with Big Eyes/Nose/Makeup enabled; no raw-image restoration or visible seams | Pixel regression Verified; device Not Verified |
| Whitening / Rosy | Compare with earlier accepted effect and check clipping at maximum | Historical acceptance; new build not verified |
| Background Blur | Diagnostic reaches mask ready, background blurs and person stays sharp; check hair, shoulders, movement, rear camera | Pixel regression Verified; model/device Not Verified |
| Combined effects | Test Natural/Soft/Glam, all controls, face leaves/re-enters frame, Beauty off shows raw view | Not Verified |
| Sustained performance | Run 3 minutes; note displayed width/processing time, visual smoothness, heat, freeze or memory issues; flip 5 times | Not Verified |
| Save/reopen | Values persist, Makeup updates immediately, save errors/success are not replaced by tracking text | Implemented; Not Verified |

The blur diagnostic reports native or CPU backend after a pixel-based feature probe. The CPU fallback is regression-tested for a simulated filter no-op; it is not real Safari acceptance. A ready mask does not prove hair-edge quality or sustained performance.

Beauty remains separate from Video Call until these results are accepted. Do not alter working call signaling or camera/PiP handling during this test.

## Additional v2.7 acceptance items

- Hold/release original comparison, including interrupted touch; saved settings must remain unchanged.
- With smoothing only, eyes/brows/nose/lips and background should keep detail. Check face contour feathering with head tilted.
- Check lip tint with mouth open and teeth visible.
- Check all reshape sliders on tilted/moving faces at 0/50/100. Effects remain local; this is not whole-face radial compression.
- Run background blur on browsers with native and CPU backend; inspect mask edges and performance.
- A processing error should leave the raw preview usable and display a diagnostic.
