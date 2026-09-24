# Nyrathen v5.7 — Monetization LiveOps contract

The Black Counter is server-configured but not dynamically personalized per player.

## Allowed production controls

- `SHOP_ROTATION_IDS`: comma-separated IDs from `SHARD_OFFERS`. Unknown IDs are ignored. Maximum six rotating offers are exposed; permanent account/guild entries remain available.
- `SHOP_EXPERIMENT_VARIANT`: `ledger` or `preview-first`. This changes presentation/order only. It must not change price, grant, product availability, combat stats, loot, difficulty, or account-specific economics.

## Human approval boundary

AI/analytics may suggest merchandising, content, or layout experiments from aggregate data. Humans approve releases, prices, economic changes, and season content. No personalized pricing, payer targeting, loot degradation, pay-to-win, paid revive, or paid random reward boxes are permitted.

## Refunds and chargebacks

Receipts are idempotent by provider + transaction ID. Refund/revoke operations reverse the recorded grant once. Spent premium currency becomes `shardDebt`; premium spending stays blocked until that debt is repaid by future verified grants.

## Required release evidence

Before real-money production is enabled: Apple sandbox purchase, Google license-test purchase, restore, pending flow, duplicate receipt, crash-after-payment recovery, refund/revoke, reinstall/device change, wrong-account replay rejection, and signed-build verification must have dated evidence.
