# Nyrathen v5.7 — GitHub macOS / iOS Simulator CI

Stand: 24.09.2026
Base: ProductionRC Hotfix14 ReleaseClosure Hardened

## Status: iOS native build COMPLETED

- Workflow: `.github/workflows/nyrathen-ios-test-V4.yml`
- Run 36029164149 — Xcode 26.6, iOS Simulator: build, install and launch all confirmed successful.
- macOS GitHub-hosted runner
- Xcode 26+ hard gate
- Node.js 22
- full regression before native build
- unsigned iOS simulator build (`npm run build:ios`)
- boots a real iPhone Simulator runtime through `simctl`
- installs `Nyrathen.app`
- launches bundle `game.nyrathen.mobile`
- verifies that the app process survives the smoke window
- captures an actual simulator screenshot and Nyrathen simulator logs
- uploads simulator app + SHA-256 + evidence as GitHub Actions artifacts
- `tools/ios-simulator-smoke.sh` contains the reusable simulator boot/install/launch/evidence flow.
- `tests/ios-simulator-ci-v57.test.mjs` prevents the workflow from silently becoming a signed/TestFlight gate.
- All obsolete duplicate iOS workflow variants have been removed; `nyrathen-ios-test-V4.yml` is the single proven workflow.

## Local verification after integration

- Full Node regression: 410/410 PASS.
- Mobile UI: 50/50 PASS.
- Project check: 122 modules PASS.
- Embedded Android/iOS web assets synchronized.
- YAML structure parses successfully.
- iOS CI contract tests: 3/3 PASS.

## What this proves

Run 36029164149 proves that Nyrathen compiles with Xcode 26.6 for an iOS Simulator, was installed into an iPhone Simulator, launched successfully and remained alive for the smoke window. The run retains a screenshot and logs for review.

## What it intentionally does NOT claim

- no physical iPhone test;
- no App Store signing;
- no IPA/TestFlight upload;
- no Apple purchase sandbox test;
- no proof of push-notification delivery on a real device.

Those gates remain open (pending) until the Apple Developer membership, signing credentials and physical device matrix are in place.
