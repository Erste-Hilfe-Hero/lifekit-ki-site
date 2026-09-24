# Nyrathen v5.7 — Canonical Native CI Workflows

Stand: v5.7 canonical native CI cleanup

This document is the single reference for which native (Android/iOS) GitHub Actions workflows are canonical for v5.7. All other native workflow variants that previously existed in `.github/workflows/` have been deleted.

## Canonical workflows

| Platform | Workflow file | Status | Run | Commit |
|---|---|---|---|---|
| Android | `.github/workflows/nyrathen-android-auto-v8.yml` ("Nyrathen Android AUTO V8") | verified SUCCESS | 36035507949 | `04ee69a6904c5d7f67d55aecdbe7fb6fc7ed75b6` |
| iOS | `.github/workflows/nyrathen-ios-test-V4.yml` ("Nyrathen iOS Test ONLY", V4) | verified SUCCESS | 36029164149 | `0ac02e9d2b304db2091768db7db303bd5c240791` |

No other file under `.github/workflows/` builds or tests the native Android or iOS projects.

## Why the older duplicates were removed

Over the course of native CI iteration, multiple superseded variants accumulated in `.github/workflows/`:

- **Android:** `nyrathen-android-auto-v6.yml`, `nyrathen-android-auto-v7.yml`, `nyrathen-android-auto.yml`, `nyrathen-android-test.yml`, `nyrathen-android-test-V2.yml`, `nyrathen-android-test-V3.yml`, `nyrathen-android-test-V4.yml`, `nyrathen-android-test-FIXED.yml`, and duplicate/parenthesized filesystem copies of these.
- **iOS:** `nyrathen-bootstrap-ios.yml`, `nyrathen-bootstrap-ios-FINAL.yml`, `nyrathen-bootstrap-ios-FIXED.yml`, `nyrathen-bootstrap-ios-REPAIR.yml`, `nyrathen-ios-test.yml`, `nyrathen-ios-test-V2.yml`, `nyrathen-ios-test-V3.yml`.

Each iteration fixed a real problem (Kotlin stdlib version drift, emulator boot flakiness, simulator process-probe compatibility with newer Xcode/iOS, etc.), but left the prior file in the repository. This created ambiguity about which workflow was authoritative, duplicated CI minutes, and made it harder to audit which run's evidence should be trusted for release-closure claims. AUTO V8 and iOS Test V4 are the final, verified versions that incorporate all prior fixes; the earlier files add no coverage the canonical versions don't already provide, so they were deleted rather than kept as historical dead weight.

## Test coverage and emulator/simulator specs

### Android — AUTO V8

- Runner: `ubuntu-latest`, Java 17 (Temurin), Node.js 22
- SDK: platform `android-36`, build-tools `36.0.0`, minSdk 26, compileSdk/targetSdk 36
- Emulator: API 36, `google_apis`, x86_64, Pixel 7 profile, KVM-accelerated
- Coverage: 410/410 full regression, Gradle dependency preflight (billing 9.1.0, Kotlin stdlib 1.8.22), debug APK build + `aapt` metadata verification, emulator install/launch/crash-smoke with logcat fatal-exception scanning

### iOS — Test V4

- Runner: `macos-latest`, Xcode 26.6 (hard gate: major version >= 26), Node.js 22
- Simulator: iPhone 17 Pro Max, iOS 26.5
- Coverage: 410/410 full regression, Mobile UI 50/50 (Playwright/Chromium), unsigned simulator build (`npm run build:ios`), simulator boot/install/launch via `tools/ios-simulator-smoke.sh`, screenshot + log evidence capture

## Next gates (still open)

Passing native CI proves the Android and iOS projects compile and run on GitHub-hosted emulators/simulators. It does **not** satisfy the following, which remain open:

- **Signed builds** — signed Android AAB/APK and signed iOS Archive/IPA, produced on a controlled build host with real signing credentials.
- **Device testing** — physical Android and iPhone device matrices, beyond emulator/simulator smoke.
- **App store publication** — Google Play Console and App Store Connect product/listing setup and submission.
- **In-app purchases** — real sandbox/license purchase, restore, refund, and revocation flows verified against live store billing on signed real-device builds.

These gates are intentionally kept open and are not implied complete by the native CI results documented here.
