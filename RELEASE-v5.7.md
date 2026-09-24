# Nyrathen v5.7.0 — Monetarisierung + Design-Refresh

## Monetarisierung

- **Der Schwarze Tresen** als eigener In-World-Shop statt generischem Mobile-Shop.
- **Nyr-Splitter** als strikt getrennte Premiumwährung; erspielte Riftmarken bleiben Gameplay-Währung.
- StoreKit 2 (iOS) + Google Play Billing 9.1.0 (Android).
- Client stößt Käufe nur an; Grants entstehen ausschließlich nach serverseitiger Verifikation und idempotentem Transaction Ledger.
- Premiumprodukte: Splitterpakete, Wanderer-/Gründerpaket, Schleierpass, Charakterplatz, Tresorflügel, Schwarzeisen-Kollektion.
- Wöchentliche Nyr-Splitter-Rotation, Wishlist und Restore Purchases.
- Season Pass mit getrenntem Free-/Premium-Track; Premium bleibt rückwirkend claimbar und verkauft keine Kampfstärke.
- Kein Echtgeld-Revive, keine bezahlten Lootboxen, keine Best-in-Slot-/Stat-/Bossdrop-Verkäufe.
- Echtgeldbuttons bleiben fail-closed, wenn der jeweilige Apple-/Google-Serververifier nicht konfiguriert ist.

## Design-Refresh nach Playtest-Feedback

Die alte gleichförmige Card-/Glow-/Glass-Sprache wurde durch **Black Iron / Rift Archive** ersetzt:

- asymmetrisches Hauptmenü mit eigener Nyrathen-Silhouette;
- Klassenwahl als schmale Insignienleiste statt Kartenwand;
- Inventar als Ausrüstungsrack/Feldkit mit geätztem Stat-Ledger;
- Systemfenster erhalten eigene Materialakzente statt identischer Cards;
- Forge, Season, Gilde, Journey und Shop sind visuell unterscheidbar;
- weniger Rundungen, Glow und generische Gradients;
- Schwarzer Tresen als eigener Ort mit Ledger-/Eisenästhetik.

## Verifikation

- Regression: **365/365**.
- Mobile UI: **50/50** (390×844 / 412×915).
- Syntax/Preflight: **101 Module**, Android/iOS WebView-Assets synchron.
- Fuzz: **320 Fälle / 0 Server-5xx**.
- Security: **225 Fälle / 0 Server-5xx**.
- Economy-Dupe-Race: **8 parallele Wiederholungen → 1 Ledger-Row**.
- Backup/Restore: SQLite integrity `ok`.

## Extern vor Echtgeld-Launch

Die native/Server-Technik ist vorhanden, aber reale Zahlungen bleiben bis zur Publisher-Konfiguration geschlossen. Noch extern erforderlich: Produkte in App Store Connect/Play Console, Signing, Apple-/Google-Verifier-Credentials und Sandbox/Testkäufe inklusive Restore/Pending/Refund-Evidenz.

## RC-Hardening · 23.09.2026

- Build `4aa61a8ed822`; 381/381 Regression und 50/50 Mobile-WebView-Checks.
- Nyr-Splitter separat im Desktop-/Mobile-HUD; Wishlist-Rückkehrsignal im Schwarzen Tresen.
- Automatische Wiederaufnahme unfertiger Store-Transaktionen nach App-Neustart auf iOS/Android.
- 13 Store-Product-IDs in `store/product-catalog.v5.7.json` eingefroren und maschinengeprüft.
- Commerce-Fuzz/Security auf Store-/Receipt-/Wishlist-/Spend-Flächen erweitert; Refund-Races und Replay idempotent.
- Analytics um Payer Conversion, Payer-Retention und Retention-Qualitätsindikator erweitert.
- Privacy/Terms/Data-Safety/App-Privacy-Drafts um Käufe, Premiumwährung und Refund/Revocation ergänzt.
- Season-I-/Cosmetic-Matrix festgelegt; Free-Track-Prestige wird technisch vom Premiumkatalog getrennt.
- 6–24h Soak-Harness um parallele Commerce-/Entitlement-Last erweitert.
- Railway Live-Services wurden geprüft, aber nicht als v5.7 ausgegeben: aktuelle Runtime-Patchrevisionen sind weiterhin v5.6. Ein separater Live-Rollout bleibt erforderlich.
