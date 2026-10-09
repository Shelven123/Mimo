# Beauty v2.6.1 verification

Run on Node.js 22 or newer, with `@napi-rs/canvas@0.1.100` available:

```sh
npm install --no-save --package-lock=false @napi-rs/canvas@0.1.100
node --test tests/beauty-engine.test.cjs
```

The five tests exercise actual Canvas pixel processing with **fake MediaPipe outputs**. They do not load the real models or simulate iPhone Safari. There is no browser automation or real-device acceptance claim.

## Consolidated iPhone Safari acceptance

Use the unified `beauty-settings.html` page with v2.6.1 visible. Record device/iOS version and screenshots or video of any failure. Keep a patterned background and even light. Set all sliders to zero and Makeup off before testing each effect separately.

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

Canvas filter support is reported in diagnostics. If unsupported, blur cannot be considered working. A supported property alone does not prove the Safari effect or edge quality.

Beauty remains separate from Video Call until these results are accepted. Do not alter working call signaling or camera/PiP handling during this test.
