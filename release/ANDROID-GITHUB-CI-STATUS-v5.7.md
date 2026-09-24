# Nyrathen v5.7 — GitHub Android Emulator CI

Stand: 24.09.2026
Base: ProductionRC Hotfix14 ReleaseClosure Hardened

## Canonical Workflow: Android AUTO V8

**Run:** 36035507949  
**Commit:** 04ee69a6904c5d7f67d55aecdbe7fb6fc7ed75b6  
**Result:** SUCCESS

### Evidence

- Full regression: **410/410 PASS**
- Build environment: Android SDK/build-tools 36, Java 17, Node.js 22
- APK metadata validation: package name, version code, version name, SDK constraints
- Android emulator: API 36 Google Play build, x86_64 Pixel 7
- Install: APK successfully installed to emulator
- Launch: App component resolver found, am start completed
- Smoke window: 20-second process survival window
- Post-window verification: Process still alive, no FATAL EXCEPTION in logcat
- Screenshot: Captured at end of smoke window
- Logcat dump: Preserved for review

### What this proves

A successful GitHub Actions run proves that Nyrathen compiles with Android SDK 36, Java 17 and Gradle for a debug APK, can be installed into an Android API 36 emulator, launches successfully and remains alive for the smoke window.

### What it intentionally does NOT claim

- no physical Android device test
- no release AAB build or signing
- no Google Play Billing real-device integration
- no external Google Play sandbox verification
- no proof of purchase flow on a real device

Those gates remain separate until signed release builds and real device access are available.

## Consolidated Workflow History

Prior variant workflows (AUTO v6/v7/plain, TEST variants) have been removed as part of v5.7 Release Closure. Android AUTO V8 is the canonical v5.7 workflow.
