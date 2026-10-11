# Private chat video review

Entry: Messages → chat → + → Send a video. Select, inspect playable preview, tap ✓ Use this video, then Send video. Confirmation does not send. Up to 180 seconds and 30 MiB; MP4/MOV/WebM subject to device decoding.

Implemented: private video_url messages; no autoplay/audio; native controls/playsinline; Video inbox preview; stable retry UUID and non-upsert object path. Contact permission checked before upload and again on the server. No arbitrary external video URLs or persisted signed tokens. Account disposal suppresses late rendering/sends. Existing photo/text/call routing retained.

Database: CLI-created 20261011121224_mimo_chat_video.sql applied via Supabase MCP. SECURITY INVOKER RPC, empty search_path, authenticated-only execution. Existing messages RLS and initial unread restriction retained. Storage upload/read helpers cover message video containers. Object metadata MIME/size verified; reference registration keeps cleanup locks and permanent claims. Registered old videos cannot be claimed. The backend does not decode media or independently enforce duration.

Verified: 217 automated tests, including real isolated PostgreSQL role/RLS/constraint/trigger checks and DOM client confirmation, retry, success, rejection, logout and safe rendering. Inline syntax and diff checks pass. Live metadata confirms column/RPC grants; no-UID upload/read denied. Advisors compared before/after; existing findings tracked below. Production customer messages/files were not created or changed as test data.

Not Verified: real phone album/cloud video import, codecs, signed playback expiry on devices, production two-account send/receive. Prior Reels keyboard/comment scrolling remains pending phone acceptance. Voice recording remains incomplete.
