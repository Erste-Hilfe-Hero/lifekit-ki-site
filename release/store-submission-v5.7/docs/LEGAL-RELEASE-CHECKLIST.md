# Nyrathen v5.7 — Legal / Store Release Checklist

Engineering compliance aid; not legal advice.

## Completed in the source package

- Original Nyrathen branding/content boundary and third-party notices.
- No advertising SDK and no third-party analytics SDK.
- In-app Community Rules acceptance for online communication.
- Block/report controls and server-side moderation/report retention controls.
- In-app registered-account and guest-profile deletion.
- Independent local solo-save deletion.
- Apple StoreKit 2 and Google Play Billing limited to explicit digital purchase/restore flows.
- Server-side purchase verification and idempotent entitlement/refund ledger.
- Frozen 13-product contract across shared code, native shells and store metadata.
- German and English app/product metadata.
- Privacy, Terms, Support and external Account Deletion HTML templates.
- Android target API 36 gate and iOS Xcode 26 / iOS 26 SDK gate in release tooling.

## External publisher steps still required

- Final legal publisher/developer name, postal address and support/privacy contacts.
- Publish Privacy, Terms, Support and Account Deletion pages at stable public HTTPS URLs.
- Create/activate all 13 products in App Store Connect and Google Play Console using the frozen IDs.
- Set final regional prices in the stores; repository price hints are not authoritative.
- Complete Apple App Privacy, Google Data Safety and age-rating questionnaires against production behavior.
- Run Apple Sandbox and Google license-test purchases, restore, refund/revocation and device reinstall/transfer scenarios.
- Final trademark clearance and legal review for target markets.
- Signed Android AAB and iOS archive from environments with the required SDK/signing credentials.

## Canonical store files

- `store/product-catalog.v5.7.json`
- `store/apple-iap-metadata.v5.7.json`
- `store/google-one-time-products.v5.7.json`
- `store/google-one-time-products.v5.7.csv`
- `store/app-localizations.v5.7.json`
- `store/STORE-LISTING-v5.7.md`
- `store/APPLE-APP-PRIVACY-DRAFT.md`
- `store/GOOGLE-PLAY-DATA-SAFETY-DRAFT.md`
- `docs/APP-STORE-REVIEW-NOTES.md`
