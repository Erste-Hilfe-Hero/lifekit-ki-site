# Nyrathen v5.1 — Referenz-/Funktionsaudit

Referenzpriorität: jack-zisa/alloy-server -> Zolmex/alloy-server -> NotTheLegend/AlloyClient. Ergänzend: evils-source-pub, astrum-core, realm-server, NR-CORE und sharp ausschließlich als Architektur-/Historienreferenzen. Offizielle RotMG/DECA-Seiten dienen nur als Funktionsreferenz. Fremde Assets, Namen, Karten, Sounds und geschützter Content werden nicht ausgeliefert; GPL-sharp-Code ist nicht Teil der Runtime.

## Abgedeckte technische Bereiche
Account/GameServer-Trennung, Persistenz, Character Saves/Roster, Inventory/Vault, Condition Effects, serverautoritative Actions/Combat, Worlds/Dungeons, Behaviors, Reconnect/Failover, Cluster-Leases, Social/Guild/Friends/DM/Trade, Delta-Transport und Mobile-only Runtime.

## Abgedeckte moderne Meta-Systeme
Pets/Eggs/Food/Fusion, Forge, Material Storage/Dismantling, Tinkerer Turn-ins, Enchantments/Rerolls/Engravings, Dungeon Modifiers, Seasons, Mission Tree, Reward Track, Crucible, Ascension, Shiny, Journey, Gift/Potion/Season Stashes, Druid-Transformationen und serverseitige Live-Rotation.

## Bewusste Nicht-Parität
Keine 1:1-Wire-Kompatibilität mit einem fremden Client, keine fremden Assets/Contenttabellen, keine GPL-Runtime-Übernahme. Nyrathen behält eigenes Protokoll, Balancing, Namen, Klassen-/Dungeon-Content, UI und Welt.
