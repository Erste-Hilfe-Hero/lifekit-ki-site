# Nyrathen v5.0.0 — finaler Testbericht

- Regression: 290/290 bestanden.
- HA-Suite: 6/6 bestanden, sauberer Prozess-Exit ohne offenen Test-Handle.
- 100-Client SSE-Soak: bestanden.
- HTTP/authoritative-input Load: 100 bestanden; 250 bestanden; 500 clusterweit (2 × 250) bestanden, 0 Fehler.
- Mobile Release Preflight: bestanden.
- Android/iOS Embedded Runtime: durch Release-Preflight synchronisiert.
- Distribution: Mobile-only; kein Browserrelease.

Grenze: Lokale Lasttests sind kein Mobilfunk-/TLS-/Produktionskapazitätszertifikat. Signierte AAB/IPA und physische Geräte benötigen externe Toolchains/Credentials.
