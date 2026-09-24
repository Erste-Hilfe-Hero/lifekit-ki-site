# Nyrathen v5.7 Closed Beta Runbook

## Purpose

Move the Hotfix 14 Production RC through signed Android/iOS builds, Google Play Internal Testing and TestFlight without weakening release gates.

## Current engineering state

- Runtime: `v5.7.0-prod-hotfix14-dungeon-boss-reward`.
- Bundle/application ID: `game.nyrathen.mobile`.
- Version/build: `5.7.0` / `57`.
- Mobile runtime remains mobile-only; no browser release artifact.
- The closed-beta workflow is manual (`workflow_dispatch`) and does not upload on push.

## Android path

1. Configure repository public URL variables.
2. Configure release keystore secrets.
3. Configure `NYRATHEN_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` after the Google Play app/package has been created and the service account granted access.
4. Run `Nyrathen closed beta` with uploads off to create a signed AAB first.
5. Complete physical-device internal smoke testing.
6. Run again with `upload_google_play=true` to target the Play `internal` track.
7. Record every device run in `release/beta-v5.7/device-results.csv`.

## iOS path

1. Configure public URL variables.
2. Configure the distribution certificate, provisioning profile, CI keychain password and Apple Development Team.
3. Configure App Store Connect API variables/secrets: issuer ID, key ID and `.p8` private key.
4. Ensure the App Store Connect app exists and TestFlight Test Information has a real feedback email and beta description.
5. Run the workflow with uploads off to create the signed IPA first.
6. Complete internal physical-device smoke testing.
7. Run again with `upload_testflight=true` to upload through the App Store Connect API.
8. External TestFlight testers require Apple's beta-review requirements to be satisfied before distribution.

## Required physical evidence

Per beta device: cold start, login, realm, combat, loot, inventory, dungeon + dungeon boss reward, suspend/resume, force-close/relaunch, reconnect, network handoff where possible, trade, legal/support links, and a continuous 30-minute session.

No simulator/emulator result counts as final physical-device certification.
