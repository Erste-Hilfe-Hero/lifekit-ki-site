# Nyrathen v5.7 Closed Beta

This package is the closed-beta handoff for the Hotfix 14 Production RC.

## Beta scope

- iOS: TestFlight internal/external testing.
- Android: Google Play Internal Testing first, then Closed Testing after the internal smoke pass.
- Multiplayer backend: Railway Hotfix 14.
- Bundle/Application ID: `game.nyrathen.mobile`.
- Version: `5.7.0` / build `57`.

## Required GitHub repository variables

- `NYRATHEN_PUBLIC_SERVER_URL`
- `NYRATHEN_PRIVACY_URL`
- `NYRATHEN_TERMS_URL`
- `NYRATHEN_SUPPORT_URL`
- `NYRATHEN_DELETE_ACCOUNT_URL`
- `APPSTORE_ISSUER_ID`
- `APPSTORE_API_KEY_ID`

## Required GitHub repository secrets

### Android signing / Play
- `NYRATHEN_KEYSTORE_BASE64`
- `NYRATHEN_STORE_PASSWORD`
- `NYRATHEN_KEY_ALIAS`
- `NYRATHEN_KEY_PASSWORD`
- `NYRATHEN_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

### iOS signing / TestFlight
- `NYRATHEN_IOS_CERTIFICATE_P12_BASE64`
- `NYRATHEN_IOS_CERTIFICATE_PASSWORD`
- `NYRATHEN_IOS_PROVISIONING_PROFILE_BASE64`
- `NYRATHEN_CI_KEYCHAIN_PASSWORD`
- `NYRATHEN_DEVELOPMENT_TEAM`
- `APPSTORE_API_PRIVATE_KEY` (contents of the App Store Connect `.p8` key)

The workflow is fail-closed: build/upload steps stop when credentials, signing material or production HTTPS URLs are missing.

## Order

1. Run `npm run beta:preflight` locally.
2. Configure repository variables/secrets.
3. Run `.github/workflows/mobile-beta.yml` with uploads disabled once to build AAB/IPA artifacts.
4. Install artifacts on the physical device matrix and complete the internal smoke checklist.
5. Re-run the workflow with the desired upload inputs enabled.
6. Record every physical-device result in `device-results.csv`.

## First store upload caveats

- Google Play API upload requires `game.nyrathen.mobile` to already exist in the Play developer account; the first app/package setup is therefore still a console action.
- The first TestFlight CI upload intentionally does not attach localized release notes. This avoids coupling binary upload to incomplete TestFlight Test Information. The repository keeps the beta notes separately so they can be entered after the real App Store Connect app/contact data exists.
