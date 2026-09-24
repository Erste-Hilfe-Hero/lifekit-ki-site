# Third-party and reference notices

## Code shipped in the mobile app

The v4.0 mobile release contains **no source code, artwork, audio, maps, text or data files from Realm of the Mad God, DECA Games, iDilly/sharp, Zolmex/alloy-server, jack-zisa/alloy-server or AlloyClient**.

The former `shared/sharp-descriptors.mjs` GPL adaptation and the `sharp` XML importer were removed before v4.0. Projectile normalization was clean-room rewritten using Nyrathen-only field names and tests.

## Public projects reviewed as engineering references

- `Zolmex/alloy-server`, MIT License, copyright 2025 Zolmex.
- `jack-zisa/alloy-server`, fork retaining the same MIT License notice.
- `NotTheLegend/AlloyClient`, reviewed for public client/server architecture concepts.
- `iDilly/sharp`, GPL-3.0, historical reference only; **no code from it is shipped in v4.0**.

The mobile/server implementation uses independently written Nyrathen code. Public commit descriptions were used to identify reliability topics such as character persistence, inventory transactions and timed condition effects. No proprietary third-party game assets or live-service data are included.
