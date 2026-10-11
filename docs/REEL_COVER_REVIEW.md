# Reel opening cover

Owner confirmed the prior playback/inline-preview changes work, then provided two screenshots: the combined format/30 MB rejection and a posted Reel with no poster. The first does not identify the selected file's size, type or duration. Current upload limits remain 90 seconds (client duration) and 30 MB (client + private bucket); no arbitrary increase or transcoding is introduced.

Implemented: distinct unsupported-format, empty-file and oversized-file errors; existing long-duration message retained. When publishing a confirmed local Reel with no chosen/linked photos, capture a JPEG from its existing inline preview at min(0.12 seconds, duration/2), longest edge 960 px. The small offset requests a decoded opening frame instead of an uninitialized frame. Wait for seek completion and ready frame; no additional video decoder, automatic play or second native selection. Cover JPEG is uploaded as the post's first image in the existing private bucket and referenced atomically with the Reel by the existing publish API. Explicit photos remain first-priority covers and are not replaced.

Capture preserves the preview position, pauses selected preview during extraction, caches by exact File for draft retries, bounds JPEG size, times out and rejects late session/source results. Failed capture keeps the draft and directs the user to retry or add a manual cover. Upload/post ambiguity uses existing request/path/Blob retry caches. No auto-deletion, bucket/policy/schema change or customer writes for verification.

Historical/hosted Reels without images request metadata and seek the initial paused player to the opening frame once. No autoplay and no seek after user playback/progress has begun. No persisted cover backfill or cross-origin canvas extraction for old/hosted URLs. Device/network decoding is still required; this fallback is not a guaranteed instant thumbnail.

Verified: 187 automated checks, JS/inline syntax and whitespace. Existing actual page publishing test now asserts automatic private cover reference, preserved explicit cover and no extraction for manual cover. New tests cover existing-player JPEG sizing/cached retry/time restoration, timeout/session failure, distinct limits and old no-poster non-autoplay seek. Prior continuous-playback/confirmation/upload/RLS tests still pass.

Not Verified: real phone canvas extraction, HEVC/HDR/color/orientation, production Storage cover upload/read, two-account poster display and all historical codecs. Opening content that is itself black will produce a black opening cover; no later-scene or AI cover selection claimed. PGlite/JSDOM assertions are not device/image-pixel verification. Limits, call/Beauty and financial features unchanged.

Rollback: revert changed frontend files/cache versions as a group. Retain generated cover objects/references for already-published posts; existing renderer/permissions support them without migration.
