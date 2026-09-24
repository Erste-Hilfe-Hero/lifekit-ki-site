# Beta Metrics

Run the read-only aggregate report against an authorized beta/state database copy:

```bash
BETA_DB_PATH=/path/to/state-authority.sqlite npm run beta:metrics
```

The report intentionally emits aggregate progression/retention only and does not print account names, tokens or player IDs.

Current limitation: Nyrathen does not persist precise play-duration telemetry, so XP/hour and kills/hour must be derived from tester session start/end records during this beta. Boss win-rate also requires attempt counts; current persistent profiles contain completions, not all attempts.
