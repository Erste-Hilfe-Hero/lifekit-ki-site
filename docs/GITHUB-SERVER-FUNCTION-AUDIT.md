# GitHub server function audit · Nyrathen 4.0.0

Audit date: 22 September 2026.

Primary public reference: `jack-zisa/alloy-server` at commit `59f7d377c42b4b605c69ad02c521a50041bd4586` (8 Sep 2026).
Upstream reference: `Zolmex/alloy-server` at commit `c4bd1169a1593fd775b59d25a40edfa1cbd475c4` (23 Aug 2026).
Both carry the MIT license. Nyrathen does not ship their code, assets, data, maps or protocol; this is a clean-room functional mapping.

## Account / persistence

| GitHub capability | Nyrathen 4.0 |
|---|---|
| Register / Verify | Registered accounts, password login, recovery code, guest upgrade |
| PurchaseCharSlot | Earned-currency character-slot expansion from 4 to 8 |
| Character list | In-app roster with active/inactive characters |
| Character delete | Explicit deletion with active-slot protection |
| Character fame | Per-character fame, death record, account fame, mastery |
| Fame list / legends | Persistent server leaderboard |
| Character save on unload | Transactional profile save on disconnect/room change/shutdown |
| Vault chest model | Persistent account vault + potion/season/gift storage |
| Account gifts | Gift chest system |
| Ban/mute records | Report/block system plus operator chat mutes |
| Class/dungeon/kill/exploration stats | Bestiary, totals, mastery, ascension, dungeon totals |

## Guild / social

| GitHub capability | Nyrathen 4.0 |
|---|---|
| Guild member list | Persistent guild members + online state |
| Guild board get/set | Leader-controlled 240-character guild board, persisted |
| Guild membership | Create, request, approve/decline, promote, kick, leave |
| Guild chat | Private guild channel |
| Trade (legacy Alloy path) | Two-party server-authoritative item trade with double confirmation |
| Friends / direct messaging | Persistent friend graph + friend-only DMs |

## Modern GameServer incoming message surface

`Create`, `EnemyHit`, `Escape`, `Hello`, `InvDrop`, `InvSwap`, `Load`, `Move`, `PlayerHit`, `PlayerShoot`, `PlayerText`, `UsePortal` are all functionally represented. Nyrathen intentionally uses its own HTTP/SSE protocol rather than Alloy TCP packet classes.

- Create/Load/Hello → session + character creation/switch/load.
- Move/Shoot/Hit → server-authoritative input, projectile, collision and damage simulation.
- Escape → immediate safe-hub return.
- InvSwap → equip/vault/trade mutations with server validation.
- InvDrop → personal server-authoritative dropped item bag, recoverable by interaction.
- PlayerText → realm/party/guild/friend chat with moderation controls.
- UsePortal → validated Realm/Dungeon routing.

## Modern GameServer outgoing surface

Alloy `AccountList`, `ConditionEffect`, `CreateSuccess`, `EnemyShoot`, `Failure`, `InvResult`, `InvUpdate`, `MapInfo`, `NewTick`, `Notification`, `Reconnect`, `ServerProjectileProps`, `ShowEffect`, `Text`, and `Update` are represented through Nyrathen snapshots/deltas, events and HTTP action results. Wire compatibility is intentionally **not** a goal.

## Worlds / gameplay engine

- Nexus → original Nyrathen `Riftwacht` safe hub.
- Realm → two shared authoritative Realms per region.
- Vault → private persistent account vault.
- Portal routing → shared realms, private/shared dungeon instances and safe hub transitions.
- Behavior action families → movement/orbit/charge/dash, projectiles/rings, heal/support, timed status effects, spawns/summons, phase transforms, environmental hazards and death-triggered portal progression are implemented in Nyrathen's own engine.
- Condition effects → stun, slow, haste, inspired/empowered and exposed equivalents affect movement/combat/AI.

## Intentional differences

- No Alloy/RotMG TCP compatibility. Mobile Nyrathen uses HTTP/SSE snapshots and delta encoding.
- No third-party maps, enemies, names, packet IDs, XML datasets, textures or balance tables.
- No in-game developer/admin cheat commands in the production client; moderation is operator-side.
- No browser game distribution in this release. The HTML/JS runtime exists only as an embedded native WebView asset and local build intermediate.
- No real-money character-slot purchase in 4.0; slot expansion uses earned in-game currency, avoiding a hidden billing dependency.

## Audit conclusion

All user-facing/current server capability groups found in the reviewed modern Alloy AccountServer/GameServer are present in Nyrathen 4.0 or intentionally replaced by a safer mobile-native equivalent. Legacy/private-server-only protocol compatibility and developer commands are intentionally excluded.
