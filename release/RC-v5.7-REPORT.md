# Nyrathen v5.7 RC — Release Report

## Local RC status

- Build fingerprint: `4aa61a8ed822`
- Regression: 381/381 passed
- Mobile WebView UI: 50/50 passed on iPhone-like 390×844 and Android-like 412×915 viewports
- Syntax/check: 105 modules; Android/iOS embedded web assets synchronized
- Security: 480 fuzz cases + 325 adversarial cases, 0 server 5xx
- State authority: 1,000-account burst passed; p99 84.56 ms
- Functional session burst: 1,000/1,000 sessions passed separately from realtime-active-player certification
- Chaos/failover: 80/80 recovered and idempotency replayed
- Commerce soak smoke: 1,536 grants, 220 revocations, 0 duplicate transaction IDs
- Store product contract: 13 IDs frozen and machine-checked
- Policy gate: API 36, StoreKit 2, Google Play Billing 9.1.0, privacy manifests/drafts, no paid power/lootboxes, earned-only prestige exclusion

## Implemented in this RC

Premium Nyr-Splitter HUD separation, wishlist-return signal, automatic unfinished-purchase recovery after restart on iOS/Android, frozen product contract, expanded commerce fuzz/security coverage, payer conversion/retention reporting, purchase-history/privacy/terms updates, Black-Iron system-family styling, Season-I cosmetic matrix, earned-only prestige gate, store-listing screenshots and a parallel gameplay + commerce 6–24h soak harness.

## Fail-closed external gates

This package is an internal release candidate, not a claimed production release. A signed Android build needs an Android SDK/API-36 build host and signing key. A signed iOS archive needs macOS/Xcode 26 and Apple signing. Real Apple/Google sandbox purchases, reinstall/device-change restore, console product creation, privacy/age-rating submissions, external playtest/security/legal/trademark checks and the full 6h+ external soak require the corresponding external accounts/devices/reviewers.

Railway production is healthy, but the live runtime logs currently identify `v5.6.0-authority-batch` on State Authority and `v5.6.0-session-rpc-batch` on GameServers. The local v5.7 RC is therefore deliberately **not** marked as live-deployed. Railway’s existing 300 simultaneous realtime-player evidence remains valid; a true 1,000-active-player certification requires the documented 14-worker / 5-logical-node topology or equivalent resources.
