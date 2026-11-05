# 0018. A premium a player cannot pay buys whole hands, once confirmed

- Status: Accepted
- Date: 2026-11-06

## Context

Under ADR 0017 a player who lost the pot and missed their insurance ended at 0. The seat still gained the premium, so the table balance stayed out by that amount, and the debt was recorded nowhere.

## Options considered

- Leave the gap for the organizer to fix: nothing shows what it was, or who owes it.
- Let the stack go below 0: stacks stay physical chips everywhere else, and the ledger holds them at 0.
- Buy without asking, as the insurance seat does: a player's hands are real money, so the organizer must see the change first.
- **Buy whole hands after a prompt**: this matches how the seat tops up, and the balance comes right.

## Decision

- `premiumBuyIns` finds the whole hands that cover what each seated player is short, and their stack once the premium is paid from them.
- The summary asks the organizer to confirm each buy-in. Cancelling leaves the hand open, with nothing written.
- The buy-in is a `rebuy` tagged with `handId`, so undoing the hand takes it back. This differs from the seat's top-up, which stays bought.
- Stacks are set one millisecond after the rest of the hand, because a `stack_set` in the same change as a `rebuy` would add to it instead of replacing it.

## Consequences

- A player who has left the table cannot buy in, so their short premium still shows as a gap in the table balance.
- A player's result in the game includes the premium, through the extra buy-in.
