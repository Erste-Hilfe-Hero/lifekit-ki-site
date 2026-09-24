# Nyrathen v5.7 — Cosmetic Launch Matrix

Stand: 23.09.2026. Diese Matrix trennt Launch-, Season-, Event- und Reserve-Inhalte und hält Prestige-Belohnungen außerhalb des Echtgeld-Shops.

## Launch — Schwarzer Tresen

- Charakter-Skins in der Wochenrotation: Blutglas-Rüstung, Aschenschleier, Nachtgewebe, Glutmantel, Elfenbeingrab.
- Waffen-/Projectile-Stile: Rissglas, Schwarzklinge, Aschenknochen. Die Vorschau zeigt die tatsächliche Projektil-/Waffenwirkung des Renderers; es wird kein separates Kampfobjekt oder Statbonus erzeugt.
- Gefährtenstile: Schleier, Glutkern, Elfenbein.
- Titel: Nachtwächter, Risskartograf.
- Gildenkosmetik: Schwarze-Wacht-Banner als permanente kosmetische Guild-Option.
- Schwarzeisen-Kollektion: Black-Iron-Skin + Schwarzklinge + Schleier-Gefährtenstil + Titel/Emote; keine Kampfwerte.

## Season I — Schleier

- Premium-Track: ausschließlich zusätzliche Cosmetics/Nyr-Splitter, rückwirkend claimbar.
- Free-Track bleibt vollständig spielbar und enthält den regulären Progressionspfad.
- Season-Premium darf weder Best-in-Slot, Damage, Revive noch garantierte Bossdrops gewähren.

## Erspielbares Prestige — niemals Shop-exklusiv

- Klassenmeisterschaft, Ascension-/Journey-Meilensteine, Dungeon-/Boss-Auszeichnungen und Ranglisten-/Event-Ehrungen bleiben erspielbare Prestige-Flächen.
- Der Standardtitel „Reisender“ sowie alle Progressionswerte bleiben unabhängig von Premiumkäufen.
- Zukünftige Prestige-Cosmetics werden mit `earned-only` markiert und dürfen nicht in `STORE_PRODUCTS` oder `SHARD_OFFERS` auftauchen.

## Event / Reserve

- Event-Slots sind für zeitlich gebundene, rein kosmetische Varianten reserviert; vor Produktion ist ein eigener Art-Pass erforderlich.
- Reserve-Inhalte werden nicht automatisch aus vorhandenen Skins durch reine Farbverschiebung erzeugt.
- Neue Premium-Cosmetics benötigen mindestens eine eigenständige Silhouette, Material-/Pattern-Sprache oder VFX/Projectile-Ausarbeitung; bloße Hue-Swaps gelten nicht als eigenständiges Premiumprodukt.

## Preview-Abdeckung

- Charakter: echte Sprite-Vorschau aus dem Renderer.
- Waffe/Projectile/VFX: echte Projektil-/Waffenstil-Vorschau aus `art.shot(...)`.
- Pet: echte Gefährten-Vorschau aus `art.pet(...)`.
- Collection/Bundle: tatsächliche Skin-Komposition; keine externen Mockups oder Beispielbilder.

## Finales Season-I-Set

- Free-Track Prestige: **Titel „Realmjäger“** (Level 5) und **Skin „ashen“** (Level 10). Beide sind `earned-only` und per Policy-Gate aus Store-/Splitter-Angeboten ausgeschlossen.
- Premium-Track „Schleier“: Titel **Nachtwächter** (5), Skin **veilborn** (10), Skin **bloodglass** (20), Emote **veilmark** (25), Titel **Risskartograf** (30) plus kleine Nyr-Splitter-Stufen. Keine Kampfwerte.
- Event-Reserve bleibt außerhalb des Launch-Katalogs, bis ein eigenständiger Art-Pass vorliegt.
