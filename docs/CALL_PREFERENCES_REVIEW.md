# Call default preferences

Settings → Calls previously saved defaults without applying them to calls. Calls now load the current user's three defaults before media acquisition and invitation creation/acceptance. Tracks are disabled before preview and peer attachment. Incoming sound means browser playback mute; browser/device audio routing is unchanged.

Read failures block startup with reload guidance. Settings-page load failures disable Save and expose Retry. No row uses existing database defaults; explicit false never falls back to true. In-call toggles do not save defaults. Camera flip/recovery preserve off state. Beauty initialization waits for an enabled camera, then uses the existing accepted pipeline.

Implemented: frontend runtime/defaults integration and accurate mirror-view copy. Verified: 68 automated checks, syntax/whitespace, production RLS metadata and own-user policies. No schema migration. Mocked media/RTC tests are not device tests. The camera-switch test checks the local disabled track/control; recovery preserves the flag in source but has no new simulated failure-path test.

Not Verified on phones:

- Save all three defaults off; start and answer calls. Both parties confirm no transmitted microphone/camera and no local incoming sound.
- Enable each in-call control; confirm media works without changing saved defaults. Redial to confirm defaults still off.
- Flip camera while off, then enable it. Confirm Beauty resumes, remote output, local preview and audio.
- Test voice calls, absent settings row, and a failed settings read. Save must remain unavailable until retry succeeds.

Rollback: revert this frontend release. No SQL rollback is needed; stored preference rows and accepted media/signaling implementation remain intact.
