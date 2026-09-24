# Android GitHub CI Status v5.7

## Canonical Android AUTO V8

**Workflow:** `.github/workflows/nyrathen-android-auto-v8.yml`
**Run:** 36035507949
**Commit:** 04ee69a6904c5d7f67d55aecdbe7fb6fc7ed75b6
**Status:** ✅ PASS

### Evidence
- Android SDK API 36 installed from hosted sdkmanager
- Java 17 verified
- Gradle dependency check: PASS (billing-client 9.1.0, Kotlin 1.8.22)
- APK build (debug): SUCCESS
- APK metadata (aapt): PASS (versionCode 57, versionName 5.7.0-dev, targetSdk 36)
- Emulator boot (API 36, google_apis, x86_64): SUCCESS
- APK install and launch: SUCCESS
- Smoke window (20 seconds): PASS
- Process alive check: PASS
- Logcat crash scan: CLEAN (no FATAL EXCEPTION, no Process death)
- Screenshot captured: SUCCESS

### What this proves
- Android SDK 36 + build-tools 36.0.0 toolchain works
- Java + Gradle + Kotlin compilation succeeds
- Google Play Billing client 9.1.0 integrates
- WebView (hosted game + StoreBridge) runs
- APK signing (debug only) works

### What this does NOT prove
- Signed AAB for Play Store release track
- Physical Android device (only emulator x86_64)
- Google Play Console product setup
- Release keystore or signing credentials
