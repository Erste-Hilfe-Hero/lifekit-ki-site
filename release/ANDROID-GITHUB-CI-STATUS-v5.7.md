# Nyrathen v5.7 — GitHub Ubuntu / Android Emulator CI

Stand: aktualisiert nach Native-CI-Konsolidierung
Base: ProductionRC Hotfix14 ReleaseClosure Hardened

## Canonical run — proven

- **Run `36035507949`** — workflow `nyrathen-android-auto-v8.yml` — API 36 emulator — Build/Install/Launch **SUCCESS**.

This is the canonical, current Android native CI workflow. Earlier V2/V3/V4/V6/V7, `auto`, and `test` variants have been removed from `.github/workflows/`; `nyrathen-android-auto-v8.yml` is the only Android workflow kept.

## What the workflow does

- `.github/workflows/nyrathen-android-auto-v8.yml`
  - Ubuntu GitHub-hosted runner (`ubuntu-latest`)
  - Node.js 22, Java 17 (Temurin)
  - hosted Android SDK configured for platform 36 / build-tools 36.0.0
  - KVM enabled for hardware-accelerated emulation
  - verifies the native Android project (Gradle files, manifest, `MainActivity`, `StoreBridge`)
  - full regression (`npm test`) before native build
  - Gradle dependency preflight confirms `com.android.billingclient:billing:9.1.0` and Kotlin stdlib `1.8.22` are actually selected (no stale `1.6.21` runtime)
  - unsigned debug APK build (`node tools/build-mobile.mjs android-debug`)
  - verifies APK metadata via `aapt dump badging` (package id, version code/name, min/target SDK)
  - boots a real API 36 (`google_apis`, `pixel_7`) Android emulator
  - installs the debug APK
  - resolves the launcher activity and launches it
  - verifies the app process survives the smoke window
  - captures a screenshot, `logcat`, `dumpsys` diagnostics and a `result.json` summary
  - uploads the APK + SHA-256 + evidence as GitHub Actions artifacts

## What run `36035507949` proves

This completed GitHub Actions run proves that Nyrathen compiles for Android API 36, produces an installable debug APK, was installed onto a real API 36 emulator, launched successfully and remained alive for the smoke window with no fatal runtime exceptions. The run retained a screenshot, `logcat` and `dumpsys` evidence for review. Native Android CI is now proven and the project is ready to move on to a **signed** App Bundle (AAB).

## What it intentionally does NOT claim

- no physical Android device test;
- no Google Play signing;
- no signed AAB/APK upload;
- no Google Play purchase (License Test) sandbox test;
- no proof of push-notification delivery on a real device.

Those gates remain separate, explicitly open items until a signed build is produced (see `docs/SIGNED-NATIVE-BUILD.md`) and a physical Android device / Play Console test is exercised.
