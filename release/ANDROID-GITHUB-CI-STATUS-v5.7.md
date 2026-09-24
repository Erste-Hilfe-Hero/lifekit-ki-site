# Nyrathen v5.7 — GitHub Android Emulator CI

Stand: v5.7 canonical native CI cleanup
Base: ProductionRC Hotfix14 ReleaseClosure Hardened

## Canonical workflow — verified SUCCESS

- Workflow: `.github/workflows/nyrathen-android-auto-v8.yml` ("Nyrathen Android AUTO V8")
- Run: **36035507949 — SUCCESS**
- Commit: `04ee69a6904c5d7f67d55aecdbe7fb6fc7ed75b6`
- Runner: ubuntu-latest GitHub-hosted, Java 17 (Temurin), Node.js 22
- Android SDK: platform **android-36**, build-tools **36.0.0**, minSdk 26, compileSdk/targetSdk 36
- Emulator: **API 36**, `google_apis`, x86_64, Pixel 7 profile
- Test coverage: **410/410** full regression
- Native Billing-Bridges compilation: **complete** — Gradle dependency preflight confirms `com.android.billingclient:billing:9.1.0` and Kotlin stdlib `1.8.22` are actually resolved (no stale `1.6.21` runtime), unsigned debug APK built via `node tools/build-mobile.mjs android-debug`
- Emulator smoke: install, launch, and crash-smoke verified via `adb` — boot-completed wait, `adb install`, launcher-component resolution, `adb shell am start`, PID-alive check after the smoke window, logcat scanned for `FATAL EXCEPTION` / process-death evidence
- Evidence uploaded as GitHub Actions artifact `nyrathen-android-test-evidence`: debug APK + SHA-256, `aapt dump badging` output, install/launch/activities/windows/package dumps, emulator screenshot, logcat, `result.json`, commit hash

All earlier Android workflow variants (`nyrathen-android-auto-v6.yml`, `nyrathen-android-auto-v7.yml`, `nyrathen-android-auto.yml`, `nyrathen-android-test.yml`, `nyrathen-android-test-V2.yml`, `nyrathen-android-test-V3.yml`, `nyrathen-android-test-V4.yml`, `nyrathen-android-test-FIXED.yml`, and duplicate/parenthesized copies) have been removed from `.github/workflows/` in favor of this single canonical AUTO V8 workflow. See `docs/CANONICAL-CI-WORKFLOWS-v5.7.md` for rationale.

## What this proves once GitHub runs it

A successful GitHub Actions run proves that Nyrathen's Android project compiles against Android SDK/API 36 with the current Gradle/AGP/Kotlin toolchain, that the resulting debug APK installs on a real API 36 emulator, launches successfully, and survives the smoke window without a fatal crash.

## What it intentionally does NOT claim

- no physical Android device test;
- no signed release AAB/APK;
- no Google Play Console upload;
- no Google Play Billing sandbox purchase test;
- no proof of push-notification delivery on a real device.

Those gates remain separate and **OPEN** until signed builds, real devices, and store console access are available:

- signed builds — **OPEN**;
- physical-device matrix — **OPEN**;
- Google Play Console / store publication — **OPEN**;
- in-app purchase (real billing) verification — **OPEN**.
