# Nyrathen v5.7 — TODO nach Monetarisierung + Design-Feedback

Stand: 24.09.2026
Basis: v5.7.0 — Build `c386de46dd81`, 396/396 Regression, 50/50 Mobile-UI, 114 Module geprüft.

## P0 — Monetarisierung fertigstellen

- [x] „Schwarzer Tresen“ als vollständige Shop-Navigation finalisieren: Featured, Cosmetics, Season, Account, Bundles, Wishlist.
- [x] Produktkatalog auf finalen Launch-Katalog reduzieren: 5 Charakter-Skins, 3 Waffen-Skins, 3 Pet-Skins, 2 Charakterplatz-Produkte, 2 Vault-Produkte, Starter Bundle, Founder Bundle, Season Pass, 1 Collection.
- [x] Nyr-Splitter-Pakete final definieren und Product IDs für Apple/Google einfrieren.
- [x] Premiumwallet vollständig im HUD/Shop anzeigen; klare Trennung zu erspielten Riftmarken sicherstellen.
- [x] Charakterplatz-Upgrades serverseitig + UI vollständig verdrahten.
- [x] Vault-Erweiterungen serverseitig + UI vollständig verdrahten.
- [x] Starter Bundle finalisieren.
- [x] Founder Bundle finalisieren.
- [x] Season Pass: Free/Premium Track, Kaufzustand und Claim-Regeln vollständig verdrahten.
- [x] Cosmetic Collections + Bundle-Rabattlogik ohne Dark Patterns.
- [x] Wishlist + Wiederkehr-Hinweis vorbereiten.
- [x] Shop-Rotation serverseitig über LiveOps-Konfiguration steuerbar machen.
- [x] Refund/Revocation-Status bis zum Account/Entitlement-Ledger vollständig anwenden.
- [x] Restore Purchases end-to-end auf beiden Plattformen absichern.
- [x] Pending Purchase und App-Crash-nach-Zahlung als automatisierte Tests ergänzen.
- [x] Echtgeld-Lootboxen und Pay-to-Win dauerhaft per Release-Gate verbieten.

## P0 — Apple / Google Billing

- [x] StoreKit-2-Bridge final prüfen: Product Fetch, Purchase, JWS, Finish, Restore.
- [x] Apple-JWS-Verifikation in State-Authority abschließen und Zertifikats-/Bundle-ID-Prüfung fail-closed machen.
- [x] Google Play Billing final prüfen: ProductDetails, Purchase, Acknowledge/Consume, Restore.
- [x] Google Play Developer API / serverseitige Purchase-Verifikation produktiv verdrahten.
- [x] Store-Produkt-IDs exakt zwischen Client, Server und Store-Konfiguration abgleichen.
- [x] Kauf darf erst nach serverseitigem VERIFIED/GRANTED abgeschlossen werden.
- [x] Doppelte Transaction IDs müssen idempotent bleiben.

## P0 — Design-Refresh wegen „KI-Look“-Feedback

- [x] Generische Glass-/Glow-/Card-Sprache aus allen Hauptfenstern entfernen.
- [x] Black Iron / Rift Archive als verbindliche Art-Direction auf alle Screens anwenden.
- [x] Hauptmenü strukturell neu bauen, nicht nur umfärben.
- [x] HUD neu ordnen: klare Kampfpriorität, weniger Boxen, weniger gleichförmige Chips.
- [x] Charakterauswahl mit eigener Silhouette, Klassenidentität und individuellen Panel-Rahmen überarbeiten.
- [x] Inventory/Vault/Forge/Enchantments jeweils eigene visuelle Sprache geben statt gleicher Modal-Vorlage.
- [x] Guild/Social/Leaderboard visuell voneinander unterscheiden.
- [x] Season/Mission Tree als eigenständiges Systemfenster gestalten.
- [x] Schwarzer Tresen darf nicht wie ein typischer Mobile-Shop wirken.
- [x] Unterschiedliche Buttonfamilien definieren: Primary, Danger, Ritual, Utility, Commerce.
- [x] Eigene Icon-Sprache statt generischer UI-Symbole etablieren.
- [x] Typografie-Hierarchie vereinheitlichen und AI-typische Microcopy entfernen.
- [x] Übermäßige Gradients, Neon-Glows und symmetrische Kartenraster reduzieren.
- [x] Leere Flächen und asymmetrische Komposition bewusst einsetzen.
- [x] Modalgrößen, Safe Areas und Touch Targets auf iPhone/Android neu prüfen.
- [x] Alle Screenshots nach Umsetzung ausschließlich vom echten Build erzeugen.

## P1 — Content + Monetarisierung

- [x] Bestehende Cosmetics inventarisieren und in Launch / Season / Event / Reserve einteilen.
- [x] Prestige-Cosmetics markieren, die ausschließlich erspielbar bleiben.
- [x] Season-1-Cosmetic-Set final auswählen.
- [x] Event-Cosmetic-Reserve definieren.
- [x] Guild Cosmetics und Pet Cosmetics vorbereiten.
- [x] Cosmetic Preview: Charakter, Waffe, Projectile/VFX und Pet.
- [x] Keine bloßen KI-Farbvarianten als eigenständige Premiumprodukte verwenden.

## P1 — Analytics / Shop-LiveOps

- [x] Events: shop_open, product_view, preview_start, wishlist_add, purchase_start, purchase_complete, purchase_failed, item_equip, season_pass_open.
- [x] Payer Conversion, ARPPU, D1/D7/D30 und Payer-Retention berechnen.
- [x] Umsatz × Retention als primären Qualitätsindikator im Monetarisierungsreport aufnehmen.
- [x] A/B-Tests nur für Reihenfolge, Preview, Bundle-Zusammenstellung und Copy erlauben.
- [x] Individuelle Preise nach Zahlungsbereitschaft technisch ausschließen.
- [x] KI darf nur Vorschläge erzeugen; Preise/Pay-to-Win/Wirtschaftsänderungen benötigen menschliche Freigabe.

## P1 — Server / Railway / Skalierung

- [x] Aktuellen v5.6/v5.7 State-Authority-Batch-Pfad sauber in v5.7 übernehmen.
- [x] Railway State/GameServer-Services auf einheitlichen v5.7-Runtime-Stand gebracht (Hotfix-10-Pfad verifiziert).
- [x] 1.000+ **gleichzeitig aktive Realtime-Spieler** auf Railway zertifiziert: 1008/1008 verbunden, 14 Worker (5/5/4), max. p99 86 ms bei SLO 180 ms, Cleanup/Storage-Health grün.
- [x] 1.000-Spieler-Test nicht gleichzeitig als 1.000-Neuregistrierungs-Burst messen; Login-Ramp und aktive Gameplay-Phase getrennt zertifizieren.
- [x] State-Authority-Timeouts und Batchmetriken erfassen.
- [x] Chaos/Failover unter hoher Last wiederholen.
- [x] 6–24h Soak-Harness mit v5.7-Shop/Entitlement-Last ergänzt. (Harness vorhanden; ununterbrochener 6–24h-Lauf siehe offenes Endurance-Gate.)

## P1 — Security / Economy

- [x] Commerce-Endpunkte in Fuzz/Security-Suite aufnehmen.
- [x] Receipt Replay, falsche Product IDs, falsche Bundle IDs, Account-Wechsel und Refund-Race testen.
- [x] Premiumwallet darf ausschließlich serverseitig verändert werden.
- [x] Audit-Log für Echtgeld-Grants, Refunds und Revocations vervollständigen.
- [x] Admin-GM-Ansicht für Kauf-/Entitlement-Historie hinzufügen.

## P2 — Store-Release

- [ ] App Store Connect Produkte anlegen. **EXTERN:** benötigt App-Store-Connect-Zugriff.
- [ ] Google Play Produkte anlegen. **EXTERN:** benötigt Play-Console-Zugriff.
- [ ] Apple Sandbox-Käufe auf echten Geräten testen. **EXTERN/DEVICE.**
- [ ] Google License/Test Purchases auf echten Geräten testen. **EXTERN/DEVICE.**
- [ ] Restore nach Gerätewechsel und Neuinstallation testen. **EXTERN/DEVICE.**
- [x] Privacy Policy um Payments/Purchase History ergänzen.
- [x] Terms/EULA um Premiumwährung, Refunds und permanente Produkte ergänzen.
- [x] Store-Texte und Screenshots an neue Art-Direction anpassen.
- [ ] Altersfreigabe/Data Safety/Privacy Labels in den Store-Konsolen final absenden. **EXTERN:** Drafts und Policy-Gates sind fertig.

## P2 — Playtest nach Design-Refresh

- [ ] Den gleichen externen Spielern erneut zeigen, die den „KI-Look“ erkannt haben.
- [ ] Blindtest: „Was wirkt handgebaut, was generisch?“ dokumentieren.
- [ ] Hauptmenü, HUD, Shop, Inventory und Character Select separat bewerten lassen.
- [ ] Nur wiederkehrendes Feedback priorisieren, nicht einzelne Geschmacksmeinungen.
- [ ] Danach letzten Design-Pass durchführen.

## Definition of Done für v5.7

- [x] vollständige Regression grün;
- [x] Mobile UI vollständig grün;
- [x] Echtgeld-Shop lokal technisch vollständig;
- [x] native Billing-Bridges kompilieren: Android AUTO V8 (`.github/workflows/nyrathen-android-auto-v8.yml`, run 36035507949, commit `04ee69a6904c5d7f67d55aecdbe7fb6fc7ed75b6`, 410/410 Tests, API36-Emulator install/launch/crash-smoke) und iOS Test V4 (`.github/workflows/nyrathen-ios-test-V4.yml`, run 36029164149, commit `0ac02e9d2b304db2091768db7db303bd5c240791`, 410/410 Tests, Mobile UI 50/50, Xcode 26.6, iPhone 17 Pro Max iOS 26.5 Simulator install/launch) sind auf GitHub-hosted Runnern grün. Signierte Builds, physische Geräte, Store-Veröffentlichung und Käufe bleiben offene externe Gates.
- [x] serverseitige Receipt-Verifikation fail-closed;
- [x] keine Pay-to-Win-/Lootbox-Produkte;
- [x] Shop und Haupt-UI visuell klar nicht-generisch;
- [x] Railway-/State-Authority-Kompatibilität auf live v5.7-Runtime bestätigt; 1008 aktive Realtime-Spieler zertifiziert (max. p99 86 ms).
- [x] Clean ZIP erneut vollständig getestet;
- [x] Paketmanifest + SHA-256 erzeugt;
- [x] finalen v5.7-Master unter `/Nyrathen/Masters/` erzeugen und prüfen.

## 24.09.2026 — Lokalisierung / Store / Produkte / Soak

- [x] 7 Runtime-Sprachen mit Settings-Auswahl verdrahtet: DE, EN, FR, ES, IT, PT-BR, TR.
- [x] Menü/HUD/Settings, Klassen, Fähigkeiten, Dungeons und zentrale dynamische UI-Texte für DE/EN/FR/ES/IT/PT-BR/TR; English-Fallback für seltene technische Meldungen.
- [x] Englischen Build in echtem Headless Chromium geprüft (Mage/Starbreak/Settings), ohne Page-Errors.
- [x] App-/Produktmetadaten für de-DE, en-US, fr-FR, es-ES, it-IT, pt-BR und tr-TR erzeugt und Längen-/ID-Verträge validiert.
- [x] Alle 13 Product IDs zwischen Runtime-Katalog, Apple- und Google-Arbeitsdateien konsistent.
- [x] Privacy/Terms/Support/Delete-Account bilingual überarbeitet und QA-renderbar gemacht.
- [x] Apple App Privacy / Google Data Safety / Review Notes / Legal Checklist aktualisiert.
- [x] Segmentierten lokalen Gameplay+Commerce-Soak nach aktuellem Stand wiederholt und dokumentiert.
- [ ] 6–24h ununterbrochenen Endurance-Soak auf dauerhaftem Runner durchführen. **EXTERN/ENDURANCE.**
- [ ] Rechtsverbindliche Publisherdaten einsetzen und die bereits implementierten fail-closed `/legal/...`-Routen live aktivieren. **EXTERN/PUBLISHER.**
- [ ] 13 Produkte samt Preisen/Territorien in App Store Connect und Google Play Console anlegen. **EXTERN/STORE-CONSOLE.**
- [ ] Sandbox-/License-Testkäufe, Restore, Refund und Revocation auf signierten Real-Device-Builds dokumentieren. **EXTERN/DEVICE.**

- [x] 1008-Spieler-Zertifizierung: 1008/1008 verbunden, 461.415 Frames, 14/14 Worker bestanden, max. p99 96 ms auf Hotfix 12.

## 24.09.2026 — Gameplay Finalpass / Cadence

- [x] New Account → Midgame als deterministischen autoritativen End-to-End-Lauf zertifiziert.
- [x] Progressionsdesign final gesperrt: ursprüngliche schwere Account-Kurve wiederhergestellt und um exakt 20 % verschärft. Forge benötigt 49.368 Account-XP (~12.342 reine Normal-Kills bei 4 XP/Kill); 600 Normal-Kills + 12 Bosse ergeben bewusst erst Account-Level 6.
- [x] Loot-/Drop-Rate im Finalpass geprüft: 234 Drops (~38 %), Zielkorridor 25–50 %.
- [x] Forge-Kosten final technisch geprüft: Tier 3→4 kostet 280 erspielte Riftmarken.
- [x] Enchantment-Kosten final technisch geprüft: Keen auf Tier 4 kostet 72 grünen Staub; 189 wurden im Lauf erspielt.
- [x] Ressourcenquellen/-senken erneut geprüft: 1.000 Economy-Transaktionen, Ratio 1,14985, Inflation 2,997 %, 0 Duplicate Receipts.
- [x] Free-vs-Premium geprüft: Midgame/Forge/Enchant vollständig ohne Premiumwährung erreichbar; P2W-Gate bleibt aktiv.
- [x] Guild-Progression im Finalpass geprüft: Create + Donate + Level 3 mit erspielter Währung.
- [x] Daily Reset implementiert und getestet; Daily-Counter und Tinkerer-Claims resetten ohne Lifetime-Verlust.
- [x] Weekly Reset implementiert und getestet; Weekly-Counter/Event-Score resetten ohne Lifetime-Verlust.
- [x] Season Reset implementiert und getestet; Season-Claims/XP/Mission-Tree resetten, Seasonal-Stash wird sicher archiviert.
- [x] Saisonaktionen außerhalb des aktiven Zeitfensters fail-closed.
- [x] Tod / Rebirth / Disconnect / Reconnect / AFK-Stale-Input Regression weiterhin grün.

### Verbleibende echte externe Gates

- [ ] 6–24h ununterbrochener Endurance-Soak auf dauerhaftem Runner. **EXTERN/ENDURANCE.**
- [ ] Rechtsverbindliche Publisher-/Firmenangaben, Support-E-Mail und Postanschrift einsetzen. **EXTERN/PUBLISHER.**
- [ ] Öffentliche Privacy/Terms/Support/Delete-Account/Impressum-Seiten nach Einsetzen echter Publisherdaten aktivieren. **EXTERN/PUBLISHER.**
- [x] Unsigniertes Android-Debug-APK auf gehostetem GitHub-Actions-Runner via Android AUTO V8 gebaut und auf API36-Emulator install/launch/crash-smoke-getestet (run 36035507949).
- [x] Unsignierte iOS-Simulator-App auf gehostetem GitHub-Actions-macOS-Runner via iOS Test V4 gebaut und auf iPhone 17 Pro Max / iOS 26.5 Simulator install/launch-getestet (run 36029164149).
- [ ] Signiertes Android AAB/APK auf SDK-36-Buildhost erzeugen und Real-Device testen. **EXTERN/BUILD-HOST/DEVICE.**
- [ ] Signiertes iOS Archive/IPA auf macOS/Xcode 26 erzeugen und Real-Device testen. **EXTERN/BUILD-HOST/DEVICE.**
- [ ] 13 Produkte, Preise und Territorien in App Store Connect / Play Console anlegen. **EXTERN/STORE-CONSOLE.**
- [ ] Sandbox-/License-Kauf, Restore, Refund, Revocation auf signierten Real-Device-Builds dokumentieren. **EXTERN/DEVICE.**
- [ ] Externer Human-Playtest/Closed Beta, Legal/Trademark und Security Review. **EXTERN/HUMAN.**


## 24.09.2026 — Release Closure / aktueller Stand

- [x] Regression nach Release-Closure-Härtung: **407/407**.
- [x] Mobile UI: **50/50**.
- [x] Endurance-Evidence fail-closed gehärtet: ein 6h-PASS benötigt jetzt echten Endreport, >=6h reale Laufzeit, 14/14 Targets, 84/84 Clients, p99 <=180 ms und gesunden Post-Cleanup-State.
- [x] Neuer `release:soak-evidence`-Validator kann den echten `NYR_LOAD_REPORT` prüfen und nur bei vollständigem PASS in die Release-Evidence übernehmen.
- [x] Production Infrastructure auf Railway direkt verifiziert.
- [x] Admin Operations Drill: Status, Ban, Unban, Audit, Commerce Report.
- [x] `admin status` gegen fehlende optionale Tabellen gehärtet.
- [x] Push-Evidence-Gate korrigiert: Push ist für v5.7 deaktiviert und benötigt deshalb keinen Provider-Nachweis.
- [x] Stufenweisen Hotfix-14-Rollout als beobachtete Canary-Evidence dokumentiert.
- [~] 6h-Endurance läuft seit 12:49 UTC mit 84 Clients auf 14 Workern; Abschluss darf erst nach echtem Endreport auf [x] gesetzt werden.
- [ ] Destruktiven Chaos-Test bei ~1000 aktiven Spielern separat zertifizieren. **EXTERN/RISKY-LIVE.**
- [ ] Off-site Production Restore dokumentieren. **EXTERN/OFFSITE.**
- [ ] DDoS/WAF Edge-Schutz tatsächlich aktivieren/beobachten und dokumentieren. **EXTERN/EDGE.**
- [ ] Publisher-/Legal-Daten einsetzen und Seiten öffentlich aktivieren. **EXTERN/PUBLISHER.**
- [ ] Signierte Android/iOS Builds + physische Geräte + Stores. **EXTERN/DEVICE/STORE.**
- [ ] Closed Beta / Crash-ANR / externe Reviews. **EXTERN/HUMAN.**
- [ ] 2k/5k/10k echte Capacity-Benchmarks. **EXTERN/CAPACITY.**
