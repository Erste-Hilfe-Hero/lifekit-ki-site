# Engineering reference sources — not shipped code

Checked 22 September 2026.

## Current server references

1. `jack-zisa/alloy-server` — latest reviewed commit `59f7d377c42b4b605c69ad02c521a50041bd4586` (2026-09-08), MIT. Useful reference topics: account/character persistence, inventory slot correctness, condition effects.
2. `Zolmex/alloy-server` — reviewed upstream commit `c4bd1169a1593fd775b59d25a40edfa1cbd475c4` (2026-08-23), MIT. Architecture: AccountServer, GameServer, Realm/Nexus/Vault concepts, packet/behavior layers.
3. `NotTheLegend/AlloyClient` — companion client architecture reference.
4. `iDilly/sharp` — historical GPL-3.0 reference, last reviewed commit `58da5a12a8677302d926cb84468a595d358686e8` (2018-07-30). No code from this repository is shipped in v4.0.

Nyrathen does not implement these repositories' network protocol and does not connect to third-party production game servers.
