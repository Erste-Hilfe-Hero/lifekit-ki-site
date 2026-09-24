# Nyrathen v5.7 — Beta Ops / Balance / State Status

Stand: 24.09.2026
Basis: ProductionRC Hotfix14 BetaPrepared
Runtime gameplay patch: `v5.7.0-prod-hotfix14-dungeon-boss-reward` (unchanged)

## Completed in this pass

- Progression sensitivity simulation added (`npm run balance:simulate`).
- Hard progression unchanged: curve 102 × (Level−1)^2; rewards 4 / 55 / 105 Account-XP.
- Unlock-deadlock analysis PASS.
- Aggregate privacy-safe beta metrics reporter added (`npm run beta:metrics`).
- Closed-beta test plan, balance capture fields and device result schema expanded.
- Economy health PASS: 1,000 transactions, source/sink 1.14985, inflation 2.997%, 0 duplicate receipts.
- Economy race PASS: duplicate requests idempotent, one ledger row.
- Commerce soak PASS: 5,552 grants, 1,111 replays, 794 revokes, 0 duplicate transaction IDs, 0 bad profiles.
- Security audit PASS: 325 cases, 0 server 5xx.
- Fuzz PASS: 480 cases, 0 server 5xx.
- Disaster-recovery drill PASS with verified SHA sidecar and restored integrity.
- Chaos recovery PASS: 80/80 recovered + replayed.
- State Authority burst PASS: 1,000 accounts, 0 failures, p99 127.39 ms (SLO 750 ms).
- Full regression: 403/403 PASS.
- Mobile UI: 50/50 PASS.
- Syntax/build: 120 modules PASS; native WebView assets synchronized.
- Store products: 13/13 PASS.
- Store/app localization: 7/7 PASS.
- Store policy gate: PASS.
- Beta local-preparation preflight: PASS; credentials/public URLs remain intentionally fail-closed.

## Production operations

- State volume had reached ~0.495 GB / 0.500 GB in the prior 24h window.
- `STATE_AUTHORITY_BACKUP_RETAIN` was reduced to 1 without changing game/runtime code.
- State service redeployed successfully on Hotfix 14.
- Current State volume after prune settled: ~0.363 GB / 0.500 GB (~72.6%).
- All Railway services currently report SUCCESS.
- Hourly `Nyrathen Production Watch` is active for service failures, State disk >=0.460 GB, persistence/state faults, failed deploys and p99 >180 ms.

## Progression interpretation

The 105-XP dungeonboss reward increases the representative 600-kill / 12-boss / 3-dungeonboss mix by 4.90% over the no-dungeon-premium baseline. Synthetic time-to-level sensitivity is intentionally not treated as player telemetry. Closed beta must provide real kills/hour and Account-XP/hour before any balance decision.

## Still external / cannot truthfully mark complete here

- Signed Android AAB and physical Android matrix.
- Signed iOS archive/IPA and physical iPhone matrix.
- App Store Connect / Google Play developer-account setup and actual beta uploads.
- Real sandbox/license purchase, restore, refund and revocation.
- Public legal URLs with real publisher identity.
- 6–24h uninterrupted endurance evidence.
- Closed beta with real testers and crash/ANR review.
- External security/privacy/legal/trademark review.
- Off-site restore, observed canary and DDoS/edge-protection evidence.

No external gate is represented as complete without evidence.
