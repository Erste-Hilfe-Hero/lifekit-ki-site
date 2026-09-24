# Nyrathen v5.7 — GitHub macOS / iOS Simulator CI

Stand: 24.09.2026
Base: ProductionRC Hotfix14 ReleaseClosure Hardened

## Neu in diesem Stand

- `.github/workflows/ios-simulator-ci.yml`
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
- Legacy manual workflow action majors normalized to stable v4 action releases already used by the release workflows.

## Local verification after integration

- Full Node regression: 410/410 PASS.
- Mobile UI: 50/50 PASS.
- Project check: 122 modules PASS.
- Embedded Android/iOS web assets synchronized.
- YAML structure parses successfully.
- iOS CI contract tests: 3/3 PASS.

## What this proves once GitHub runs it

A successful GitHub Actions run will prove that Nyrathen compiles with Xcode 26+ for an iOS Simulator, can be installed into an iPhone Simulator, launches successfully and remains alive for the smoke window. The run will retain a screenshot and logs for review.

## What it intentionally does NOT claim

- no physical iPhone test;
- no App Store signing;
- no IPA/TestFlight upload;
- no Apple purchase sandbox test;
- no proof of push-notification delivery on a real device.

Those gates remain separate until the Apple Developer membership and signing credentials are active.
