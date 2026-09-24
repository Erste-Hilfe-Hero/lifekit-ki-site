# Alloy → Nyrathen v4.0 conversion matrix

Nyrathen does **not** ship Alloy source code, packets, assets, maps, names, or data. The public MIT-licensed Alloy projects were reviewed as architecture/reliability references. The implementation below is Nyrathen code using Nyrathen protocols and data structures.

| Alloy reference concept | Nyrathen implementation | Release status |
|---|---|---|
| AccountServer / account persistence | `server/store.mjs` + account/session HTTP APIs | implemented |
| GameServer / authoritative world loop | `server/server.mjs` + `shared/adventure.mjs` | implemented |
| Character save on unload | `saveSession` / transactional profile persistence on disconnect, room change, shutdown | implemented/tested |
| Character identity instead of detached copy | active character slot + persistent roster profile | implemented/tested |
| PurchaseCharSlot / expandable roster | earned-currency slots, 4 base up to 8 | implemented/tested |
| Guild board | persistent leader-managed board | implemented/tested |
| InvDrop | server-authoritative personal drop bag + recovery | implemented/tested |
| Inventory slot validation | server-authoritative item IDs, equip-family validation, capacity checks | implemented/tested |
| Safe drop/swap behavior | atomic action path + item identity checks + rollback on persistence fault | implemented/tested |
| Batched/idempotent inventory actions | request IDs + persistent action receipts prevent duplicate execution | implemented/tested |
| Condition effects | timed stun/slow/exposed/haste/inspired effects integrated in combat/AI | implemented in Nyrathen model |
| RealmManager / worlds | region engines with Riftwacht, realms, dungeons and instance ownership | implemented |
| Nexus / Vault | original Riftwacht hub + account vault/special storage | implemented |
| Portal routing | server-validated realm/dungeon transitions | implemented/tested |
| Behavior engine | Nyrathen enemy/boss phase logic and projectile/hazard patterns | implemented |
| TCP packet protocol | **not copied**; Nyrathen uses HTTP/SSE snapshot/delta protocol | intentional replacement |
| Alloy client compatibility | **not included**; Nyrathen native WebView client only | intentional replacement |

Reviewed references:
- `jack-zisa/alloy-server` through commit `59f7d377c42b4b605c69ad02c521a50041bd4586` (2026-09-08).
- `Zolmex/alloy-server` through commit `c4bd1169a1593fd775b59d25a40edfa1cbd475c4` (2026-08-23).
- `NotTheLegend/AlloyClient` used only to understand the companion-project boundary.
- `iDilly/sharp` is historical GPL-3.0 reference only; its old adapter/importer was removed from v4.0.
