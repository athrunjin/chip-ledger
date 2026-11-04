# 0009. Versioned JSON backups, and restore only adds records

- Status: Accepted
- Date: 2026-11-04

## Context

Guest data exists only on the device and is lost when changing devices or clearing the browser, so JSON backups are needed. The ledger is append-only (ADR 0005),
so a restore must not rewrite existing events. Backup files can also be edited by hand, so they have to be validated on load.

## Options considered

- Clear local data and write the backup: simple, but choosing the wrong file loses newer local data.
- Overwrite records with the same ID: rewrites ledger events, breaking append-only.
- **Merge by ID, adding only**: loses no data and rewrites no existing records.

For validation, hand-written checks are easy to get wrong. Zod is the project's chosen validation library, and this is its first use.

## Decision

- File structure: `format`, `version`, `exportedAt`, plus `games`, `players` and `ledgerEvents`.
- `Repository` gains `backup.exportAll` and `backup.restore`. A restore runs in one transaction: everything is written or nothing is.
- Records whose ID already exists stay as they are and count as skipped.
- `apps/web` depends on `zod` to validate files. Backups newer than the current version are rejected, as are files whose ledger refers to a missing game, player or event.

## Consequences

- If one game is edited separately on two devices, a restore doesn't merge game settings or status and the local copy wins. Ledger events have different IDs and do merge.
- Players created separately on different devices have different IDs, so a restore can produce duplicate names.
- Future data structure changes must raise `version` and add upgrade logic to parsing.
- Zod is only in `apps/web` for now, so `core` still has no dependencies.
