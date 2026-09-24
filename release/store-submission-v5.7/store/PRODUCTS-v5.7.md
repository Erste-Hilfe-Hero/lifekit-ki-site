# Nyrathen v5.7 — Store Products

Frozen package/bundle ID: `game.nyrathen.mobile`. The 13 IDs below are the canonical identifiers used by client, server, Android and iOS. Product IDs are treated as immutable once created in Apple/Google consoles.

## Product model

| Product | Apple type | Google behavior | Repeatable |
|---|---|---|---:|
| `nyr.shards.180` | consumable | consumable | yes |
| `nyr.shards.500` | consumable | consumable | yes |
| `nyr.shards.1100` | consumable | consumable | yes |
| `nyr.shards.2400` | consumable | consumable | yes |
| `nyr.shards.5200` | consumable | consumable | yes |
| `nyr.bundle.wanderer` | non-consumable | entitlement | no |
| `nyr.bundle.founder` | non-consumable | entitlement | no |
| `nyr.season.veil01` | non-consumable | entitlement | no |
| `nyr.account.slot` | consumable | consumable | yes |
| `nyr.account.slots3` | consumable | consumable | yes |
| `nyr.account.vault` | consumable | consumable | yes |
| `nyr.account.vault2` | consumable | consumable | yes |
| `nyr.collection.blackiron` | non-consumable | entitlement | no |

## Localizations

Customer-facing German and English names/descriptions are frozen in `apple-iap-metadata.v5.7.json`, `google-one-time-products.v5.7.json` and `google-one-time-products.v5.7.csv`. Apple display names are kept within 30 characters and descriptions within 45 characters. Google titles/descriptions also fit its one-time-product limits.

## External console work still required

Creating/activating the products in App Store Connect and Google Play Console requires account access and cannot be proven by the source package alone. After creation, verify every ID against `npm run store:products` and perform Apple Sandbox / Google license-test purchases before production submission.
