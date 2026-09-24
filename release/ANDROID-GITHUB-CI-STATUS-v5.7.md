# Nyrathen v5.7 — GitHub Android Emulator CI

Stand: 24.09.2026
Base: ProductionRC Hotfix14 ReleaseClosure Hardened

## Status: Android native build COMPLETED

- Workflow: `.github/workflows/nyrathen-android-auto-v8.yml`
- Run 36035507949 — API36 Android Emulator: build, install and launch all confirmed successful.
- Ubuntu GitHub-hosted runner
- Android SDK / Platform 36 hard gate
- Node.js 22
- full regression before native build
- unsigned Android debug build (`npm run build:android`)
- boots a real Android Virtual Device (API 36) through the Android emulator
- installs `app-debug.apk`
- launches package `game.nyrathen.mobile.dev`
- verifies that the app process survives the smoke window
- captures logcat and emulator evidence
- uploads the debug APK + SHA-256 + evidence as GitHub Actions artifacts
- All obsolete duplicate Android workflow variants have been removed; `nyrathen-android-auto-v8.yml` is the single proven workflow.

## Local verification after integration

- Full Node regression: 410/410 PASS.
- Mobile UI: 50/50 PASS.
- Project check: 122 modules PASS.
- Embedded Android/iOS web assets synchronized.
- YAML structure parses successfully.

## What this proves

Run 36035507949 proves that Nyrathen compiles against Android API 36, was installed onto an Android emulator, launched successfully and remained alive for the smoke window. The run retains logs and evidence for review.

## What it intentionally does NOT claim

- no physical Android device test;
- no signed release AAB;
- no Play Store upload;
- no Google Play purchase/license test;
- no proof of push-notification delivery on a real device.

## Next gates

- Signed AAB production build (`npm run build:android:bundle` with real keystore secrets).
- Physical Android device matrix testing.
- Google Play Console product setup and Data Safety / age rating validation.

Those gates remain open (pending) until signing credentials and a physical device matrix are in place.
