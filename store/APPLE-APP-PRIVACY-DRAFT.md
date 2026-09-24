# Apple App Privacy — v5.7 Submission Worksheet

Engineering worksheet for App Store Connect. Final selections must match the production server and the published Privacy Policy.

## Data processed for online features

- **User ID / account identifiers:** guest ID or registered account name; authentication tokens/hashes server-side.
- **Gameplay / app activity:** characters, inventory, vault, progression, guild/friend relationships, leaderboard values and server session state.
- **User content:** chat messages; report evidence may include the most recent server-visible message when the user submits a report.
- **Diagnostics / security:** session timing, rate-limit/security/moderation events and voluntary diagnostic reports.
- **Purchases:** product ID, store transaction/JWS or purchase token, entitlement/refund/revocation status and timestamps for verification, restore and duplicate/fraud prevention.

## Not collected by this release

- No advertising identifier.
- No cross-app/site tracking.
- No third-party advertising or analytics SDK.
- No payment-card or bank-account data received by Nyrathen.
- No camera, microphone, contacts or precise-location data.

## Purposes

- App functionality and multiplayer.
- Account management.
- Purchase verification and entitlement restore.
- Security, anti-abuse and moderation.
- User-requested support/diagnostics.

## StoreKit use

StoreKit 2 is limited to user-initiated digital purchases, transaction recovery/restore and finishing verified transactions. Product metadata is localized in German, English, French, Spanish, Italian, Brazilian Portuguese and Turkish.

## Final human checks

Confirm data retention, production processor/operator details, legal publisher identity and public Privacy URL before submitting the App Privacy questionnaire.
