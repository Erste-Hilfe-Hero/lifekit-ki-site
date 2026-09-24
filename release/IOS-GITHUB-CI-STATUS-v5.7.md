# Nyrathen v5.7 — GitHub macOS / iOS Simulator CI

Stand: 24.09.2026 (aktualisiert: v5.7 canonical native CI cleanup)
Base: ProductionRC Hotfix14 ReleaseClosure Hardened

## Canonical workflow — verified SUCCESS

- Workflow: `.github/workflows/nyrathen-ios-test-V4.yml` ("Nyrathen iOS Test ONLY", V4)
- Run: **36029164149 — SUCCESS**
- Commit: `0ac02e9d2b304db2091768db7db303bd5c240791`
- Runner: macOS GitHub-hosted, Xcode **26.6**
- Simulator: **iPhone 17 Pro Max, iOS 26.5**
- Test coverage: **410/410** full regression, **Mobile UI 50/50**
- Native Billing-Bridges compilation: **complete** (unsigned iOS simulator build via `npm run build:ios`)
- Simulator install/launch verified via `tools/ios-simulator-smoke.sh` (`simctl install`, `simctl launch`, process-alive smoke window)
- Evidence uploaded as GitHub Actions artifact `nyrathen-ios-test-evidence`: simulator app zip + SHA-256, screenshot, Xcode version, simulator list, commit hash

All earlier iOS workflow variants (`nyrathen-bootstrap-ios*.yml`, `nyrathen-ios-test.yml`, `nyrathen-ios-test-V2.yml`, `nyrathen-ios-test-V3.yml`) have been removed from `.github/workflows/` in favor of this single canonical V4 workflow. See `docs/CANONICAL-CI-WORKFLOWS-v5.7.md` for rationale.

## What was verified

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
