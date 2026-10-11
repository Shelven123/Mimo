# Plaza interaction notifications

Implemented: trusted new post likes/comments generate owner-only notifications. Activity & Posts preferences control delivery; missing settings enable new delivery. Self interactions, absent auth, mismatched actor and either-direction blocked contacts produce no notices. No historical replay. Matching mutation retries do not duplicate; transaction advisory locking plus notice history suppress unlike/re-like spam for each post/actor. Deleting history can permit a later new like notice.

Notification text is generic, never copies private comment text. Valid UUID destinations open the existing focused Plaza view; deleted/hidden posts use the existing unavailable state and current RLS. Existing notification read-state permissions remain unchanged. New replies now notify the parent commenter as well as the post author. A parent who is also the post author gets only the existing post notice; self replies produce no parent notice. Parent delivery separately respects Activity & Posts and either-direction blocks against the actor or post author. Reply notifications use the existing direct post destination, not a specific comment anchor. No follower broadcasts or push/email.

Security: private schema definer trigger is required to insert recipient records clients cannot forge; auth.uid must equal new.user_id, empty search_path, explicit qualification, execute revoked from PUBLIC/anon/authenticated. Existing interaction RLS and guards are retained.

Automated Verified: 235 checks pass, including retry/self/preference/ownership behavior and safe navigation. Production trigger metadata and pre/post advisors checked at deployment. User Verified: fixed Home layout explicitly accepted; no acceptance of this notification batch. Not Verified: real two-account phone workflow. No real customer interactions were created for verification.

Rollback: database/rollback-plaza-notifications.sql preserves all interaction and notification history while disabling these producers.


2026-10-12 follow-up: CLI-created migration 20261011185026_mimo_comment_reply_notifications.sql adds a private, client-nonexecutable, empty-search-path definer INSERT trigger. No public API/schema grants or RLS changes. Validates actor identity, same-post root parent and current visibility before inserting generic content. Matching RPC retries do not insert a second comment and therefore do not emit a second notice. No historical backfill. Rollback database/rollback-comment-reply-notifications.sql disables only the new parent producer and preserves all history and the original post producer.

Automated Verified: 243 checks, covering two recipients, Host reply, self/owner overlap, retry, owner-only reads, independent settings, both block directions, parent recipient unable to view the post, no-auth imports, denied client trigger execution, anonymous denial and rollback. User Verified: none for reply delivery. Not Verified: real two-account production transactions and phone workflow. Follower broadcasts and push/email remain incomplete.

Production deployment: migration applied successfully; the new reply INSERT trigger and original post-comment trigger are enabled. Private producer has an empty search path and no anon/authenticated EXECUTE privileges. Security and performance advisors are unchanged from the pre-deploy baseline. No customer data was mutated for verification.
