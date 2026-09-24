# Nyrathen v5.7 — GitHub client design sources

This design pass keeps Nyrathen's own art, branding, gameplay, commerce, networking, and content. The UI is reimplemented in Nyrathen's HTML/CSS/JS stack from design and layout conventions visible in public GitHub client sources.

## Primary licensed reference — AlloyClient

- `NotTheLegend/AlloyClient` — MIT License (repository `LICENSE`).
  - `Game/Components/Hud/HudView.cs`: fixed 240 px right-side HUD rail.
  - `Game/Components/Hud/Inventory/InventoryGrid.cs`: 8-slot, four-column inventory; 48 px tiles with 5 px spacing; dark `0x242222` inventory surface.
  - `Game/Components/Hud/Inventory/EquippedGrid.cs`: four equipment slots; 49 px tiles with 4 px spacing; gray `0x454545` slot surfaces.
  - `Game/Components/Hud/Inventory/ItemTile.cs`: solid tile language, unusable-item dark red treatment and tier labels.
  - `Game/Components/Hud/InteractPanel.cs`: persistent context/interact surface inside the HUD rail.
  - `Screens/TitleScreen.cs`: large central `play` option with smaller secondary text actions.
  - `Screens/CharacterListScreen.cs`: compact character-list screen with top account/currency information and a strong divider hierarchy.
  - `Ui/Components/Buttons/TextButton.cs`: white active text and warm `0xFFDC85` hover accent.
  - `Ui/Components/Dialogs/Dialog.cs`: centered dark dialogs with simple white typography.
  - `Ui/Components/Graphics/ScreenDarkenOverlay.cs`: flat dark modal overlay.
- `jack-zisa/AlloyClient` was checked as a related MIT-licensed fork/reference and uses the same AlloyClient UI family.

## Additional historical layout reference — RealmClient

- `UniverseRealms/astrum-core` / `Zolmex/astrum-core` → `RealmClient`
  - `ui/panels/Panel.as`: compact interaction-panel convention.
  - `ui/panels/InteractPanel.as`: persistent side interaction surface.
  - `ui/panels/itemgrids/ItemGrid.as`: four-column grids.
  - `ui/panels/itemgrids/InventoryGrid.as`: eight inventory slots in two rows.
  - `ui/panels/itemgrids/EquippedGrid.as`: four equipment slots.
  - `ui/StatusBar.as`: simple flat status bars.
  - `screens/CharacterSelectionAndNewsScreen.as`: compact character/menu composition.
  - `screens/TitleMenuOption.as`: bold white menu labels with a warm hover treatment.

The `astrum-core` roots checked during this pass did not expose a clear repository license file. Nyrathen therefore uses those trees only as a structural/historical reference and does not import their ActionScript, SWFs, sprites, fonts, or embedded assets.

## Nyrathen implementation

- Desktop HUD rail: **240 px**, matching the modern AlloyClient HUD proportion.
- Quick equipment: **4 × 49 px** slots with **4 px** gutters.
- Quick inventory: **4 × 2** slots at **48 px** with **5 px** gutters.
- Inventory/vault: right-side drawer on desktop; touch-safe bottom sheet on narrow phones.
- Menu/character selection: compact flat client hierarchy rather than the prior Black-Iron/Rift-Archive treatment.
- Flat dark/gray panel family (`#202020`, `#242222`, `#363636`, `#454545`, `#545454`) with warm `#ffdc85` hover accent.
- Nyrathen sprites, item art, character art, names, gameplay, store logic, networking and server code remain Nyrathen's own current v5.7 implementation.
