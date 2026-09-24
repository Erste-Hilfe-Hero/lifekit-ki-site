# Signierte Mobile-Builds

Nyrathen wird nur als iOS-/Android-App ausgeliefert. Die GitHub-Actions-Datei `.github/workflows/mobile-store-release.yml` erzeugt nach erfolgreichem Testlauf signierbare Store-Artefakte, sobald die privaten Store-Zugangsdaten als Repository-Secrets gesetzt sind.

## Android / Google Play

Erforderliche Secrets:

- `NYRATHEN_KEYSTORE_BASE64` – Base64 des privaten JKS/Keystores.
- `NYRATHEN_STORE_PASSWORD`
- `NYRATHEN_KEY_ALIAS`
- `NYRATHEN_KEY_PASSWORD`

Die Pipeline installiert API 36, baut `app-release.aab` und veröffentlicht AAB + SHA-256 nur als kurzlebiges CI-Artefakt. Der Keystore wird nie ins Repository geschrieben.

## iOS / App Store

Erforderliche Secrets:

- `NYRATHEN_IOS_CERTIFICATE_P12_BASE64`
- `NYRATHEN_IOS_CERTIFICATE_PASSWORD`
- `NYRATHEN_IOS_PROVISIONING_PROFILE_BASE64`
- `NYRATHEN_CI_KEYCHAIN_PASSWORD`
- `NYRATHEN_DEVELOPMENT_TEAM`

Die Pipeline prüft vor dem iOS-Build ausdrücklich Xcode 26+ und erstellt anschließend einen temporären macOS-Keychain, importiert Zertifikat und Provisioning Profile, baut ein Xcode-Archiv und exportiert `Nyrathen.ipa`. Zertifikate/Profiles werden nur im temporären Runner verwendet.

## CI-evidenziierte Builds (v5.7)

Android AUTO V8 (API 36): GitHub Actions run 36035507949 mit commit 04ee69a6904c5d7f67d55aecdbe7fb6fc7ed75b6 hat einen Debug-APK erfolgreich gebaut, auf einem Gerät installiert und die Spiellogik und native Store-Bridge bei Crash-Smoke-Tests validiert.

iOS Test V4 (Xcode 26.6): GitHub Actions run 36029164149 mit commit 0ac02e9d2b304db2091768db7db303bd5c240791 hat ein Xcode-Archiv erfolgreich in einem Simulator gebaut und gestartet.

Signierte AAB/IPA: Siehe unten unter "Nicht automatisiert".

---

## Nicht automatisiert

Die Pipeline lädt absichtlich nichts automatisch in App Store Connect oder Google Play hoch. So bleibt der letzte irreversible Store-Schritt unter manueller Kontrolle. Erst nach echten Geräte-/Closed-Test-Ergebnissen soll hochgeladen werden.

## Öffentliche Build-Variablen für Store-Builds

Vor einem signierten Build müssen im Repository außerdem folgende **Variables** (keine Secrets) gesetzt sein:

- `NYRATHEN_PUBLIC_SERVER_URL`
- `NYRATHEN_PRIVACY_URL`
- `NYRATHEN_TERMS_URL`
- `NYRATHEN_SUPPORT_URL`
- `NYRATHEN_DELETE_ACCOUNT_URL`

Alle fünf Werte müssen öffentliche `https://`-URLs sein. Der CI-Workflow bricht vor dem Build ab, wenn eine URL fehlt. Die vier Legal-/Support-URLs werden in den nativen Client eingebettet und bei einem ausdrücklichen Nutzertipp im Systembrowser geöffnet.

## Closed beta automation (v5.7)

`.github/workflows/mobile-beta.yml` is the fail-closed closed-beta workflow. It always validates the mobile release first, then builds a signed Android App Bundle and a signed iOS IPA. Uploads are explicit workflow-dispatch choices, never automatic on a normal push.

- Google Play beta target: `internal` track via `r0adkll/upload-google-play@v1`.
- Apple beta target: TestFlight via `apple-actions/upload-testflight-build@v5` using App Store Connect API credentials.
- Google release notes are present for de-DE, en-US, fr-FR, es-ES, it-IT, pt-BR and tr-TR.
- TestFlight beta information template is stored in `.apple-actions/test-information.json`.
- Physical device results must be recorded in `release/beta-v5.7/device-results.csv`; simulators/emulators do not satisfy the release device gate.

Additional beta credentials:

- `NYRATHEN_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- repository variables `APPSTORE_ISSUER_ID` and `APPSTORE_API_KEY_ID`
- secret `APPSTORE_API_PRIVATE_KEY`

Google Play requires the application/package to already exist in the developer account before API uploads can succeed. TestFlight upload likewise requires an App Store Connect app and API key with sufficient role.
