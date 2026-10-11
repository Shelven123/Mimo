# Plaza interaction notifications

Implemented: trusted new post likes/comments generate owner-only notifications. Activity & Posts preferences control delivery; missing settings enable new delivery. Self interactions, absent auth, mismatched actor and either-direction blocked contacts produce no notices. No historical replay. Matching mutation retries do not duplicate; transaction advisory locking plus notice history suppress unlike/re-like spam for each post/actor. Deleting history can permit a later new like notice.

Notification text is generic, never copies private comment text. Valid UUID destinations open the existing focused Plaza view; deleted/hidden posts use the existing unavailable state and current RLS. Existing notification read-state permissions remain unchanged. Comment replies currently notify the post author, not separately the parent commenter. No follower broadcasts or push/email.

Security: private schema definer trigger is required to insert recipient records clients cannot forge; auth.uid must equal new.user_id, empty search_path, explicit qualification, execute revoked from PUBLIC/anon/authenticated. Existing interaction RLS and guards are retained.

Automated Verified: 235 checks pass, including retry/self/preference/ownership behavior and safe navigation. Production trigger metadata and pre/post advisors checked at deployment. User Verified: fixed Home layout explicitly accepted; no acceptance of this notification batch. Not Verified: real two-account phone workflow. No real customer interactions were created for verification.

Rollback: database/rollback-plaza-notifications.sql preserves all interaction and notification history while disabling these producers.
