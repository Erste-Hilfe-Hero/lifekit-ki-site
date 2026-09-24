# GitHub iOS CI — Start here

The repository is ready for an unsigned Apple simulator test without an active paid Apple Developer membership.

Workflow: `.github/workflows/ios-simulator-ci.yml`

It automatically runs on relevant pushes/PRs to `main` and can also be started manually from **Actions → iOS simulator CI → Run workflow**.

A passing run produces the artifact `nyrathen-ios-simulator-evidence`, containing:

- `Nyrathen-Simulator.zip`
- its SHA-256
- simulator screenshot
- Xcode version
- selected simulator metadata
- launch/process evidence
- Nyrathen simulator logs
- machine-readable result JSON

No Apple signing secret is required for this simulator workflow.
