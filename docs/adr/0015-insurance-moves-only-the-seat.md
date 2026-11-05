# 0015. Insurance moves only the seat, once its card is dealt

- Status: Superseded in part by [0017](0017-finished-hand-sets-stacks.md)
- Date: 2026-11-05

## Context

ADR 0014 moved the premium from the player to the insurance seat at purchase, and the payout back on a hit. In play this was wrong: all-in players' chips are in the pot, so the premium changed a stack before anything had happened, and the organizer types every stack after the hand anyway, so the moves were overwritten or counted twice.

## Options considered

- Keep moving both sides, but only when the card is dealt: player stacks would still change, and typing the stacks after the hand would overwrite them.
- Keep purchases outside the ledger: the seat's result would need a second money flow, which ADR 0014 ruled out.
- **Move the seat alone, when the card is dealt**: player stacks stay whatever the organizer typed, and the seat keeps the insurance result.

## Decision

- `insurance_buy` moves no chips. It only records the sale.
- `insurance_settle` changes the seat by the premium less the payout, and never changes a player's stack. Reversing it takes that back.
- `insuranceTopUp` counts the premium as available, because it reaches the seat in the same change as the payout.
- Replaying events applies this to games already in the ledger.

## Consequences

- After a card is settled, the table balance shows the insurance result as a gap until the organizer types the players' stacks. This is the same step that records the hand itself.
- A pending purchase has no effect on any stack or on settlement.
