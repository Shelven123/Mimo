# Beauty v2.7.2 verification

Run on Node.js 24 using the locked test dependencies:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

Fifteen engine tests exercise actual Canvas pixel processing with **fake MediaPipe outputs**. Four JSDOM tests exercise page handlers with **fake camera/auth/engine**. They do not load real models or simulate iPhone Safari. The regression workflow runs relevant PRs and main pushes. Browser visual automation was not performed (browser archive download failed).

## Consolidated iPhone Safari acceptance

Use the unified `beauty-settings.html` page with v2.7.2 visible. Record device/iOS version and screenshots or video of any failure. Keep a patterned background and even light. Set all sliders to zero and Makeup off before testing each effect separately.

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

## v2.7.2 status
User generally accepted the v2.7.1 layout and effects. This is not a recorded prolonged motion/performance test. Scale/roll changes with a stationary nose, mouth-expression changes, and face loss/reacquisition now have pixel regressions with fake landmarks. For device acceptance, turn/tilt the head, move closer/farther, speak and leave/re-enter frame; then run three minutes and flip cameras. Device acceptance of v2.7.2 remains pending.

## Video-call integration acceptance
31 automated checks now include 12 call adapter/lifecycle tests with mocked video/RTC/model dependencies. They are not two-party browser or iPhone tests. User accepted v2.7.2 standalone stability before integration. The new integration itself remains device Not Verified.

Save your Beauty settings and start a video call. The remote partner must confirm processed video matches your local preview. Check Beauty off/on, Camera off/on (remote must not see the last processed face), front/rear flip, PiP swap, audio/mute, hangup/redial, and three minutes of use. Verify a voice call still works. Startup is raw-first; a failed Beauty load should leave audio/video working. Call-only toggle does not save the preference.

## Video-call feedback and live adjustment
User reports only Smoothing/Whitening/Rosy working in VIDEO CALL; other effects ineffective. Do not call this resolved or accepted. Open Adjust under the call Beauty control; verify actual loaded Slim Face value, move it 0/100 and check the status reports processed video and detected face. Original-camera or no-face status means reshape is not currently active. 33 automated checks include live parameter updates and changed values during startup; they do not establish the cause of the user's phone issue.

## Retained call model
36 tests now cover engine retention across off/on and rapid off during cached sender replacement. The Beauty circle opens the adjustment panel; its checkbox switches between original camera and processed output. Off retains the model but disables effects; flip/hangup dispose it. The user recording shows loading-face status after a toggle, with no panel values captured. Actual call reshape remains unverified and unaccepted.
