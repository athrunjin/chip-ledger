# 0010. Buying in by hands: games fix chips per hand, and the ledger keeps recording chips

- Status: Accepted
- Date: 2026-11-04

## Context

Organizers want to record buy-ins and rebuys in whole hands and adjust them quickly at the table. The ledger is append-only (ADR 0005),
so existing records can't be edited. Blinds can change mid-game. A "hand" (手) here means one buy-in unit, not a hand of cards.

## Options considered

- Record hands in ledger events: simpler display, but old data would need migrating and cash-outs usually aren't whole hands.
- Save only the big blind multiple and compute a hand from the current big blind: changing blinds would change what hands mean within a game.
- **Save chips per hand on the game and keep recording chips in the ledger**: the ledger and settlement don't change, and hands are only an entry and display format.

## Decision

- `Game` gains optional fields `buyInBigBlinds` and `handChips`. `handChips` is converted when the game starts, and a result that isn't a whole number of chips is an error.
- Once the ledger has events, `handChips` stops changing, like the currency and chip ratio. Changing blinds doesn't affect hands.
- `adjustHands` works out which events to append: an increase records the difference, and a decrease reverses the latest buys and records any excess again.
- `LedgerRepository` gains `appendAll`, so reversals and the replacement record are written together: all of them or none.
- Writes for one game are queued with TanStack Query's `scope`, and each adjustment reads the latest ledger, so rapid taps never calculate from stale data.
- Older games without `handChips` keep recording chips. The backup format stays at version 1 because the new fields are optional.

## Consequences

- The Supabase implementation (M6) must also make `appendAll` atomic.
- Adjusting chips per hand mid-game isn't supported for now. See #I-004 in docs/IMPROVEMENTS.md.
