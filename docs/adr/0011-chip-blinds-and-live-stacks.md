# 0011. Blinds in chips, and live stacks as ledger events

- Status: Accepted
- Date: 2026-11-04

## Context

Organizers think in chips at the table, so blinds should be entered and stored in chips. They also want each player's current stack, a win/loss and a live table balance.
The ledger is append-only (ADR 0005), so typed stacks can't be stored by editing records.

## Options considered

- Keep blinds as money and convert in the form: the conversion may not give whole chips, and rounded money would drift from what was typed.
- Store the current stack on a player record outside the ledger: simple, but it can't be audited or undone, and a restore couldn't merge it.
- Treat a reversal as removing its event when replaying: a typed 700 would stay 700 after removing a hand bought before it, when the organizer expects 200.
- **Blinds in chips, and a `stack_set` event with changes replayed as deltas**: every event changes the stack by an amount, and a reversal takes that amount back.

## Decision

- `Game` stores `smallBlindChips` and `bigBlindChips` as whole chips, replacing the money fields. Chips per hand are the big blind × the multiple, so no conversion can fail.
- Existing data is upgraded by `upgradeLegacyGame`, in Dexie database version 2 and when reading version 1 backups. Blinds are rounded to whole chips and stay at 1 or more. Blinds are display only, so rounding moves no money.
- Backups move to version 2. Older backups still restore.
- `stack_set` is a new ledger event. `summarizeByPlayer` derives `stackChips` and `netChips` by replaying events. The stack never goes below 0.
- Events with the same timestamp count as one change, so a reversal plus its replacement buy can't stop at 0 halfway. They're written with one timestamp, and a cash-out written with them gets a later one.
- The table balance is the sum of `netChips`, in chips.
- Settlement still uses buy-ins and cash-outs only, and everyone must leave first.

## Consequences

- Blinds on older games may differ slightly from the money they were entered as, if they didn't convert to whole chips.
- At a 1:1 ratio a ¥0.5 small blind needs a different chip ratio.
- The Supabase implementation (M6) must keep the shared timestamp when writing `appendAll` batches.
