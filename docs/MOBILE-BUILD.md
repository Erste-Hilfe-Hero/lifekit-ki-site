# Android und iOS · v5.7 (native CI validiert)

**Native Kompilierung ist inzwischen durch reale GitHub-Actions-Läufe bewiesen.** Android CI Run **`36035507949`** (`.github/workflows/nyrathen-android-auto-v8.yml`) hat einen API-36-Build erzeugt, auf einem Emulator installiert und erfolgreich gestartet (Build/Install/Launch **SUCCESS**). iOS CI Run **`36029164149`** (`.github/workflows/nyrathen-ios-test-V4.yml`) hat mit Xcode 26.6 einen iOS-Simulator-Build erzeugt, installiert und erfolgreich gestartet (Build/Install/Launch **SUCCESS**). Beide Läufe sind die kanonischen Nachweise, dass die native Billing-Bridge und der WebView-Client tatsächlich kompilieren, installieren und starten. Weiterhin **nicht** enthalten: ein signiertes Release-AAB/-APK, ein signiertes iOS-Archiv/IPA sowie jeder Test auf einem physischen Gerät oder in einem Store — diese Gates bleiben separat und offen.

## Assets aktualisieren

```sh
npm run native:sync
npm run check
```

Der Build aktualisiert `native/android/app/src/main/assets/game` und `native/ios/Nyrathen/Web`. Die Spiel-HTML wird direkt aus dem Produktionsbundle in beide Native-Projekte synchronisiert; beim Synchronisieren wird der Hosting-Marker von `integrated` auf `native` gesetzt. Es wird bewusst keine standalone Browser-Spiel-HTML erzeugt. Nach jeder Änderung des Spiels vor einem nativen Build erneut synchronisieren.

## Android

Projekt `native/android`, Java + Plattform-WebView. Enthaltene Projekteinstellungen: minSdk 26, compileSdk/targetSdk 36, Android Gradle Plugin 8.13.2, Gradle 8.13 und JDK 17. VersionCode 50, VersionName 4.0.0. Das sind Konfigurationswerte, keine hier bewiesene Build-Kompatibilität.

In Android Studio das Gradle-Projekt öffnen, die geforderten SDK-/Build-Tools bereitstellen, Sync und Build/Run ausführen. Bei passend eingerichteter Umgebung:

```sh
cd native/android
chmod +x gradlew
./gradlew :app:assembleDebug
```

Das beigelegte `gradlew` ist ein kleiner Bootstrap, kein vollständiger Standard-Wrapper. Unter macOS/Linux lädt er die offizielle Gradle-Distribution mit zugehöriger SHA-256-Prüfung; Internet, curl und unzip werden benötigt. Windows `gradlew.bat` ruft den beigefügten PowerShell-Bootstrap auf, der ebenfalls die offizielle Distribution und deren SHA-256 lädt. Die lokale Ausführungsrichtlinie bleibt unverändert; alternativ das Projekt in Android Studio öffnen. Der PowerShell-Pfad wurde hier nicht auf Windows ausgeführt. Android Studio kann das Projekt direkt öffnen. Es wird kein vorkompiliertes Wrapper-JAR verteilt.

Nach einem erfolgreichen Build wäre die Debug-APK unter `app/build/outputs/apk/debug/app-debug.apk`; diese Datei existiert noch nicht in der Lieferung. Debug-ID `game.nyrathen.mobile.dev`, Release-ID `game.nyrathen.mobile`. Vor Veröffentlichung eigene eindeutige IDs und Signierung festlegen. Private Schlüssel und Passwörter gehören nicht ins Projekt.

Die WebView lädt die eigene Spiel-HTML unter `https://app.nyrathen.local`. Fremde Navigation, HTTP-Mischinhalte und beliebiger Dateizugriff bleiben blockiert. Ein expliziter Import nutzt den System-Dokumentpicker; Export öffnet den System-Speichern-Dialog für genau drei zugelassene Backup-/Diagnosedateinamen. Kein breiter Speicherzugriff, keine automatische Veröffentlichung. Der neue Bridge-Code muss tatsächlich auf Android getestet werden.

## iOS

Auf einem Mac `native/ios/Nyrathen.xcodeproj` öffnen. Scheme `Nyrathen`, Mindestziel iOS 16.4, Marketingversion 4.0.0, Buildnummer 50. Eigenes Signing Team und Bundle-ID wählen. Beispiel für einen späteren Simulatorbuild:

```sh
cd native/ios
xcodebuild -project Nyrathen.xcodeproj -scheme Nyrathen \
  -sdk iphonesimulator -configuration Debug \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
```

UIKit/WKWebView laden nur drei gebündelte Ressourcen über `nyrathen://app`; die Ansicht liegt innerhalb der Safe Area. Die Datei-Bridge erlaubt nur festgelegte JSON-/Textnamen, prüft Hauptframe und Ursprung, bereitet eine temporäre Datei vor und öffnet ausdrücklich den systemeigenen Teilen-Dialog. Kein Zugriff auf beliebige Pfade oder automatische Freigabe. Import läuft über den WebView-Dateidialog. Ursprung, Fetch/SSE, Speicher, Picker und Bridge auf echten Geräten prüfen; nicht CORS pauschal öffnen oder TLS-Prüfung abschalten.

Für eine IPA sind später ein Xcode-Archive und Export mit eigener Signierung erforderlich. Store-/TestFlight-Zugang, Metadaten, Datenschutz-/Privacy-Manifest-Fragen und die konkreten Freigaben sind nicht Bestandteil eines hier abgeschlossenen Releases.

## Mobile Prüfliste

Offline-Erststart; Speicher nach vollständiger App-Beendigung; Solo-Export und bestätigter Import; privater Wiederherstellungscode-Export; zwei Finger gleichzeitig; kleine Geräte und Drehung; Hintergrund/Vordergrund; Audio nach Unterbrechung; WebView-Prozessabbruch; Anmeldung auf zweitem Gerät; Netzverlust/Wiederkehr; längere Bosssitzung; Framezeit, RAM, Akku und Wärme. Chromium-Viewportprüfungen decken diese native Prüfliste nicht ab.

## Primärreferenzen zur weiteren Geräteprüfung

- Android WebChromeClient / Dateiauswahl: https://developer.android.com/reference/android/webkit/WebChromeClient
- Android Storage Access Framework: https://developer.android.com/training/data-storage/shared/documents-files
- Apple WKScriptMessageHandler: https://developer.apple.com/documentation/webkit/wkscriptmessagehandler
- Apple WKWebView: https://developer.apple.com/documentation/webkit/wkwebview

Die Implementierung bleibt eigener Quellcode; die Referenzen belegen keine erfolgreiche Ausführung dieses Projekts auf einem Gerät.

## Aktuelle native Build-Grenze

`npm run build:android` und `npm run build:ios` prüfen zuerst die lokale Umgebung. Ohne Android SDK 36 beziehungsweise macOS/Xcode stoppen sie mit einem maschinenlesbaren Befund, bevor Webassets geändert oder Gradle heruntergeladen wird. Bei vollständiger Umgebung werden die Webassets neu gebaut/geprüft und danach der jeweilige native Compiler gestartet. Ein Erfolg wird nur bei vorhandenem Ausgabeartefakt gemeldet.

In dieser lokalen Sandbox-Umgebung fehlen weiterhin Android SDK/API 36 beziehungsweise macOS/Xcode, daher stoppen die lokalen `npm run build:android`/`build:ios`-Aufrufe hier weiterhin vor der Kompilierung. Das ist jedoch nicht mehr der Gesamtstatus des Projekts: auf den gehosteten GitHub-Actions-Runnern mit echtem Android-SDK beziehungsweise echtem Xcode wurde die native Kompilierung bereits real bewiesen. Android CI Run **`36035507949`** (`nyrathen-android-auto-v8.yml`) hat einen echten API-36-Debug-Build erzeugt, ihn auf einem Emulator installiert und gestartet (Build/Install/Launch **SUCCESS**). iOS CI Run **`36029164149`** (`nyrathen-ios-test-V4.yml`) hat mit Xcode 26.6 einen echten unsignierten Simulator-Build erzeugt, ihn installiert und gestartet (Build/Install/Launch **SUCCESS**). Beide Läufe liefern Artefakte, Logs und Screenshots als GitHub-Actions-Evidence. Weiterhin offen bleiben: ein signiertes Release-AAB/-APK, ein signiertes iOS-Archiv/IPA und jeder Test auf einem physischen Gerät oder in einem Store.

Für ein späteres Release-AAB auf einem eigenen eingerichteten System:

```sh
npm run build:android:bundle
```

Benötigte Prozess-Umgebungsvariablen: `NYRATHEN_KEYSTORE` (absoluter Pfad zur eigenen Keystore-Datei), `NYRATHEN_STORE_PASSWORD`, `NYRATHEN_KEY_ALIAS`, `NYRATHEN_KEY_PASSWORD`. Nicht in das Projekt, `.env.example`, Buildprotokolle oder Git schreiben. Die Variablen werden von Gradle gelesen, nicht als Passwortargumente auf der Kommandozeile übergeben. Der AAB-Pfad wäre `native/android/app/build/outputs/bundle/release/app-release.aab`. Ein AAB ist nicht das direkte Installationsformat für beliebige Handys; diese Ausgabe wurde hier nicht erzeugt.

Für ein Xcode-Archiv auf einem Mac mit eigener Signierung:

```sh
npm run build:ios:archive
```

`NYRATHEN_DEVELOPMENT_TEAM` muss zum eigenen eingerichteten Apple-Team gehören. Das Skript akzeptiert keine fremden Accounts und ruft keinen automatischen Provisionierungsdownload oder Upload auf. Ergebnis wäre `native/ios/build/Nyrathen.xcarchive`; anschließender kontrollierter Export/Distribution und Gerätetests bleiben erforderlich. Eine `.xcarchive`-Datei oder Simulator-App ist keine Geräte-IPA.

Die Gradle-Signing-Konfiguration und die Archive-Befehle sind Quellcode, nicht durch einen nativen Build bewiesen. Die Tests prüfen lediglich Vorbedingungen, Pfadauswahl und das Zurückhalten von Geheimnissen in Diagnoseberichten.

Die GitHub-Actions-Datei `.github/workflows/mobile-store-release.yml` wird ausschließlich manuell per `workflow_dispatch` gestartet. Sie validiert Produktions-/Legal-URLs und kann mit eigenen Secrets ein signiertes Android-AAB beziehungsweise iOS-IPA erzeugen. Es wurde in dieser Unterhaltung kein externer Workflow gestartet und keine Signing-Credential gespeichert.

Primärreferenzen, abgerufen am 22.09.2026: Android-Builds https://developer.android.com/build/building-cmdline ; Android-WebView-Ressourcen https://developer.android.com/develop/ui/views/layout/webapps/load-local-content ; Apple-Verteilung https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases ; manuelle Workflows https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows . Diese Quellen belegen die Werkzeugverträge, keinen Build dieses Spiels.
