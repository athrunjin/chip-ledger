# 0016. An insurance hand as a draft, written to the ledger when finished

- Status: Accepted
- Date: 2026-11-05

## Context

Trying the calculator showed that an all-in is one piece of work: choose the players, enter the board, buy, deal, settle, and buy again. The organizer may leave the page in the middle and must come back to the same step. Nothing should reach the table until the organizer closes the hand, and records should read as hands, not single purchases.

## Options considered

- Write each purchase to the ledger as it is made: changing a decision would need reversals, and the seat would show a result before the hand ended.
- Keep the draft in browser storage: it would sit outside the repository, and backups and accounts would miss it.
- **A separate table of hands**: drafts can change freely, and the append-only ledger only sees finished results.

## Decision

- `InsuranceHand` holds the players, dead money, board, purchases, declined offers and the current step. Its table is `insuranceHands`, and the database moves to version 4. Each change is saved, so leaving the page loses nothing.
- A game has at most one open hand. The calculator opens on it, and on a new hand when there is none.
- The dealt card decides each purchase, by whether it is among the cards sold. The organizer no longer marks a hit or a miss for these.
- Finishing writes every purchase and its result to the ledger in one write, tagged with `handId`, with the same timestamp as any hands bought for the seat. Writing checks for that `handId` first, so a retry cannot pay twice.
- Finished hands stay in the table as the record of the board and players. Undoing a hand reverses its ledger events and removes the row.
- A cover player has no chip amount: `stakeOf` uses the deepest of the others. At most one player can be the cover, and a hand does not need one.
- A hand with nothing bought is still recorded, and writes nothing to the ledger.
- Backups move to version 4 and include hands, open ones too. Older backups still restore.

## Consequences

- The ledger does not show insurance while a hand is open, so settling the game warns about an open hand.
- Outs-count purchases keep working as single records, marked hit or miss by hand.
- The Supabase implementation (M6) needs the `insuranceHands` table.
- A preflop all-in is not supported yet: its option is shown disabled.
