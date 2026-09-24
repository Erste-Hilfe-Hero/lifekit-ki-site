# Nyrathen v5.7 — GitHub macOS / iOS Simulator CI

Stand: aktualisiert nach Native-CI-Konsolidierung
Base: ProductionRC Hotfix14 ReleaseClosure Hardened

## Canonical run — proven

- **Run `36029164149`** — workflow `nyrathen-ios-test-V4.yml` — Xcode 26.6, iPhone Simulator — Build/Install/Launch **SUCCESS**.

This is the canonical, current iOS native CI workflow. Earlier bootstrap/V2/V3/`ios-test` variants have been removed from `.github/workflows/`; `nyrathen-ios-test-V4.yml` is the only iOS workflow kept.

## What the workflow does

- `.github/workflows/nyrathen-ios-test-V4.yml`
  - macOS GitHub-hosted runner (`macos-latest`)
  - Xcode 26+ hard gate (verified `>= 26` at runtime)
  - Node.js 22
  - full regression before native build
  - unsigned iOS simulator build (`npm run build:ios`)
  - boots a real iPhone Simulator runtime through `simctl`
  - installs `Nyrathen.app`
  - launches the app bundle
  - verifies that the app process survives the smoke window
  - captures an actual simulator screenshot and Nyrathen simulator logs
  - uploads simulator app + SHA-256 + evidence as GitHub Actions artifacts
- `tools/ios-simulator-smoke.sh` contains the reusable simulator boot/install/launch/evidence flow.

## What run `36029164149` proves

This completed GitHub Actions run proves that Nyrathen compiles with Xcode 26.6 for an iOS Simulator, was installed into an iPhone Simulator, launched successfully and remained alive for the smoke window. The run retained a screenshot and logs as workflow evidence. Native iOS CI is now proven and the project is ready to move on to a **signed** build.

## What it intentionally does NOT claim

- no physical iPhone test;
- no App Store signing;
- no IPA/TestFlight upload;
- no Apple purchase sandbox test;
- no proof of push-notification delivery on a real device.

Those gates remain separate, explicitly open items until a signed build is produced (see `docs/SIGNED-NATIVE-BUILD.md`) and the Apple Developer membership / signing credentials are exercised on a physical device.
