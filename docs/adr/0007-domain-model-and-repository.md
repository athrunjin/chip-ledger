# 0007. Domain model and repository interface in core, Dexie implementation in apps/web

- Status: Accepted
- Date: 2026-11-04

## Context

ADR 0005 chose to isolate storage behind a repository interface, but didn't say where the interface lives or how a repository instance relates to an organizer.

## Options considered

- A new `packages/data` for the interface and implementations: clear boundaries, but with one app an extra package adds nothing.
- Interface in `apps/web`: a future server or player app couldn't reuse it.
- **Interface and domain types in `packages/core`, implementations in the app**: `core` still holds only pure functions and types.

## Decision

- Domain types and the `Repository` interface live in `packages/core/src/domain`.
- The Dexie implementation lives in `apps/web/src/data`, adding the runtime dependency `dexie` (already chosen in ADR 0005) and the test dependency `fake-indexeddb`.
- One repository instance is bound to one organizer: reads are scoped automatically, and writing another organizer's data throws.
- `LedgerRepository` offers only reads and appends, so the interface itself guarantees the ledger is append-only.
- The chip-to-cash ratio is a pair of integers. Ledger events record chips, and amounts are derived from the ratio.

## Consequences

- The Supabase implementation (M6) only has to implement the same interface, with row-level security as the backstop for organizer isolation.
- Bulk import later (JSON restore, importing guest data into an account) will need dedicated interface methods.
