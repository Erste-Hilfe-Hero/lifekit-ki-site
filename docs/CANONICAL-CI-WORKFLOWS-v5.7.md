# Canonical CI Workflows for v5.7

Stand: 24.09.2026

This document declares the canonical GitHub Actions workflows used for Nyrathen v5.7 native builds.

## Android: AUTO V8

- **Workflow File:** `.github/workflows/nyrathen-android-auto-v8.yml`
- **Trigger:** Push to main on workflow/native/android changes, or manual `workflow_dispatch`
- **Runtime:** Ubuntu Linux, Android SDK/build-tools 36, Java 17, Node.js 22
- **Build Gate:** npm test (410/410 regression), then gradle :app:assembleDebug
- **Test Gate:** Android API 36 emulator smoke test
- **Evidence:** Commit, APK metadata, emulator logs, screenshot
- **Status:** STABLE v5.7
- **Last Run:** 36035507949 (SUCCESS)

## iOS: Test V4

- **Workflow File:** `.github/workflows/nyrathen-ios-test-V4.yml`
- **Trigger:** Manual `workflow_dispatch` only
- **Runtime:** macOS-latest, Xcode 26+ (hard gate), Node.js 22
- **Build Gate:** npm test (410/410 regression), mobile UI checks (50/50), then npm run build:ios (unsigned simulator app)
- **Test Gate:** iPhone Simulator boot, app install/launch, 20-second smoke window
- **Evidence:** Commit, app bundle, Xcode version, simulator logs, screenshot
- **Status:** STABLE v5.7
- **Last Run:** 36029164149 (SUCCESS)

## Removed Workflows

As part of v5.7 Release Closure:
- Android duplicates: AUTO v6/v7/plain, TEST v2/v3/v4-duplicate/plain, TEST-FIXED/TEST(2)
- iOS duplicates: bootstrap-ios (all variants), test-V2/V3/plain

These consolidated into the two canonical workflows above.

## Pre-Build Validation

Both canonical workflows enforce:
1. **Regression gate:** npm test (full automated regression)
2. **Project structure verification:** Package name, SDK versions, required files
3. **Dependency preflight:** Kotlin version, Android Billing SDK version
4. **YAML syntax check:** GitHub Actions linting on workflow files

## Smoke Test Gate

Both canonical workflows include post-build smoke tests:
- **Android:** Emulator API 36, install, launch, 20-second process survival
- **iOS:** iPhone simulator, unsigned app, install, launch, 20-second process survival

Both capture emulator/simulator logs, process listing and screenshot evidence.

## Manual vs. Automated Trigger

- **Android AUTO V8:** Automatic on push to main, also manual dispatch
- **iOS Test V4:** Manual `workflow_dispatch` only (no automatic trigger)

This reflects the test scheduling requirements: Android smoke tests run continuously, iOS tests run on-demand by the release/QA team.

## Future Gates (External)

Signed builds, real device testing, App Store/Play Console publishing, purchase/billing sandbox validation, and closed-beta testing remain separate external gates not represented in these workflows.

## Validation Tooling

- `.github/workflows/` files validated by GitHub Actions parser
- `npm run check` for JavaScript/Node project structure
- `npm test` for full regression
- `.venv-ui/bin/python tools/test-mobile-release.py` for Mobile UI checks
- Emulator/simulator bash scripts with explicit process verification

## CI Versions Locked

- Node.js: 22 (setup-node@v4)
- Java: 17 temurin (setup-java@v4)
- Ubuntu/macOS: latest (runner images managed by GitHub)
- Android SDK: 36 (explicit sdkmanager install)
- Xcode: 26+ (explicit version gate)
- Gradle: declared in native/android/gradlew
