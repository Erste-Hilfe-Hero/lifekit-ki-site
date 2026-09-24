# Nyrathen v5.7 Beta / Native Status

## Prepared and verified

- Dedicated manual closed-beta CI workflow exists.
- Android API 36 AAB build path is configured.
- iOS Xcode 26+ archive/IPA build path is configured.
- Google Play Internal Testing upload path is configured and explicit.
- TestFlight upload path is configured and explicit.
- Play beta release notes exist for all seven supported store locales.
- TestFlight beta-information template exists.
- Physical-device matrix CSV and tester instructions exist.
- Beta workflow YAML parses successfully.
- Local beta preparation preflight passes.
- Full regression after beta additions: 401/401 PASS.
- Mobile UI: 50/50 PASS.
- Syntax/build: 117 modules PASS, native assets synchronized.

## Real native build attempts on this host

Android AAB is blocked only by this host lacking Android SDK/API 36 and private release signing material. Android debug is blocked by the missing Android SDK/API 36.

iOS archive/simulator builds are blocked because this host is not macOS and has no Xcode; the release archive also requires the user's Apple Development Team.

## Still external

- Repository/store credentials and signing material.
- App creation/configuration in App Store Connect and Google Play Console.
- Real TestFlight / Play Internal upload execution.
- Physical-device beta matrix and crash/ANR review.
- Real sandbox/license purchase/restore/refund/revocation evidence.
