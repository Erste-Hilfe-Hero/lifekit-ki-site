# Google Play Data Safety — v5.7 Submission Worksheet

Engineering worksheet for the Play Console. Final answers must match the production server, deletion process and published Privacy Policy.

## Data processed for online features

- **Account information:** account name or guest identifier.
- **App activity:** gameplay state, characters, inventory, vault, progression, guild/friend relationships and leaderboard values.
- **Messages / user-generated content:** chat and report evidence when the player submits a report.
- **Diagnostics / security:** technical session, rate-limit, anti-abuse and moderation information; voluntary diagnostic reports.
- **Purchase history:** product ID, Google Play purchase token/transaction state, entitlement and refund/revocation status. Nyrathen does not receive card/bank details.

## Product behavior

- All digital goods are one-time in-app products; consumable behavior is handled for Nyr Shards and repeatable account expansion products.
- Google Play Billing is used only for player-initiated digital purchases and restore/recovery flows.
- Purchases are server-verified before entitlement grant.

## Safety / privacy properties

- HTTPS-only production transport.
- No advertising SDK.
- No third-party analytics SDK.
- No ad-ID based tracking.
- No camera, microphone, contacts or precise-location permission.
- Account/guest deletion is available in-app and an external deletion page is prepared for publication.

## Localization

DE/EN/FR/ES/IT/PT-BR/TR one-time-product titles/descriptions are frozen in `store/google-one-time-products.v5.7.json` and the companion CSV worksheet.

## Final human checks

Confirm retention periods, production operator/processors, legal publisher identity, public Privacy URL and external deletion URL before completing the Play Console Data Safety form.
