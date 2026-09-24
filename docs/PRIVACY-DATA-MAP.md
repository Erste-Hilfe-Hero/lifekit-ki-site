# Nyrathen multiplayer data map

Engineering inventory for privacy disclosures; final legal policy must use the actual production host/operator details.

## Stored by the self-hosted multiplayer server

- Guest player ID and hashed guest access token.
- Optional account username; password is stored only as a salted scrypt-derived hash. A recovery code is stored only as a hash.
- Gameplay profile: characters, progression, inventory, vault, currencies, achievements/mastery, pets/companions and world state.
- Social state: friends, guilds, party-related state where persistent.
- Moderation: block relationships and player reports, including a server-known quoted chat message when attached to a report.
- Operational action receipts used to prevent duplicate writes.

## Not included by default

- No advertising SDK.
- No analytics SDK.
- No third-party tracking SDK.
- No precise location, contacts, microphone, camera or advertising ID permission.
- Chat is not intended as permanent chat history; moderation reports may retain a quoted server-known message.

## Local device data

- Solo save, settings and recent diagnostic errors are stored locally in the embedded game runtime.
- Export/import occurs only after explicit user action through the system document/share UI.

Production privacy disclosures must identify the real server operator, lawful basis, retention period, data-subject contact, processors/hosting provider and deletion workflow.
