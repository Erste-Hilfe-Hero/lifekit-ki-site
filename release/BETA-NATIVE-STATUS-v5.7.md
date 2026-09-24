# Nyrathen v5.7 — Beta / iOS / Android Status

Stand: 24.09.2026
Basis: ProductionRC Hotfix 14

## Beta engineering — PASS

- Dedicated manual GitHub Actions workflow: `.github/workflows/mobile-beta.yml`.
- Android signed AAB build path prepared for API 36.
- Google Play Internal Testing upload step prepared; upload is explicit, never automatic on push.
- iOS signed archive/IPA build path prepared with Xcode 26+ gate.
- TestFlight upload prepared through the App Store Connect API; upload is explicit.
- Seven localized Play beta release notes prepared: de-DE, en-US, fr-FR, es-ES, it-IT, pt-BR, tr-TR.
- Tester instructions, feedback template and physical-device result matrix prepared.
- Beta workflow YAML parsed successfully.
- Beta local-preparation preflight: PASS.
- Full regression after beta/ops additions: 403/403 PASS.
- Mobile UI: 50/50 PASS.
- Syntax/build: 120 modules PASS; native WebView assets synchronized.
- Product contract 13/13, store localization 7/7, store policy PASS.

## Native build attempts on this host

Android debug/AAB cannot be built on this host because Android SDK/API 36 is not installed. The release AAB additionally needs the user's private keystore credentials.

iOS simulator/archive cannot be built on this host because it is not macOS and has no Xcode. The release archive additionally needs the user's Apple Development Team/signing material.

These are environment/signing blockers, not detected application compile regressions.

## Upload blockers that remain external

- Real Android keystore/signing secrets.
- Google Play developer account, existing `game.nyrathen.mobile` app/package and authorized service-account JSON.
- Apple distribution certificate, provisioning profile, Apple Development Team.
- Existing App Store Connect app plus issuer ID, API key ID and private `.p8` key.
- Real beta feedback/support contact information.
- Public legal pages activated with the real publisher identity.
- Physical Android/iPhone beta devices.

No signed binary, TestFlight upload, Play Internal upload or physical-device evidence is claimed without the corresponding real credentials/hardware.
