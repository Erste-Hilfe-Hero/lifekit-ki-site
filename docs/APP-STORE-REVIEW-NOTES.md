# App Store Review Notes — Nyrathen v5.7

Nyrathen is an original mobile cooperative pixel action RPG. The complete game client is bundled inside the native app; the app does not load or wrap a third-party website. Online play connects only to Nyrathen multiplayer infrastructure.

## Review path

1. Launch Nyrathen.
2. Choose a class and player name.
3. Solo mode works without an online account.
4. Online mode supports guest play and optional account registration.
5. Open **Black Counter / Schwarzer Tresen** from the HUD to view optional digital products.
6. Purchases are initiated only after an explicit user tap and entitlements are granted only after server-side store verification.
7. Settings contains Privacy/Community links, diagnostics, local-save deletion and access to account/safety controls.

## Monetization

- 13 frozen product IDs are defined in `store/product-catalog.v5.7.json`.
- Consumables: Nyr Shard currency packs and repeatable account-expansion grants.
- Non-consumables: Founder/Wanderer bundles, Season I pass and Black-Iron cosmetic collection.
- No paid loot boxes, no paid revive, no sale of combat stats or direct combat power.
- StoreKit 2 is used only for user-initiated purchases, restore/recovery and transaction completion.

## Privacy / permissions

- No advertising SDK.
- No third-party analytics SDK.
- No camera, microphone, contacts or location permission.
- Online play processes account/guest identifiers, gameplay state, social data, moderation/report data and verified purchase/entitlement records.
- Nyrathen does not receive card or bank-account details.
- Block/report and account deletion are available in the product.

## Localization

The app runtime and store metadata support German (`de-DE`), English (`en-US`), French (`fr-FR`), Spanish (`es-ES`), Italian (`it-IT`), Brazilian Portuguese (`pt-BR`) and Turkish (`tr-TR`). In-app-purchase display names/descriptions for all seven locales are frozen in `store/apple-iap-metadata.v5.7.json`.

## External submission fields still requiring the publisher account

- Final public HTTPS Privacy, Terms, Support and Account Deletion URLs.
- Final legal publisher identity/contact.
- App Store Connect product creation/pricing and Sandbox evidence.
- Reviewer account only if the final production configuration disables guest review access.
