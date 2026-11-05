# 0014. Insurance as a seat in the game

- Status: Accepted
- Date: 2026-11-05

## Context

M3 adds all-in insurance. Premiums and payouts change hands in chips at the table, the organizer needs the table balance to stay right while they do, and settlement needs to show who took the result. Insurance also needs a rule that varies by game, multiway pots with side pots, and saved rules for quick reuse.

No open-source code could be reused: the closest calculators handle two players only and have no license. Hand evaluators exist, but the maintained one adds about 536 KB to a PWA for something a hundred lines can do.

## Options considered

- Keep insurance outside the chip flow as an adjustment at settlement: the table balance would be wrong during the game, and stacks would not match the chips on the table.
- Store a real player named 保险: it would appear in the player list and in player reports, and need filtering everywhere.
- Let the settlement page work out insurance from purchases alone: this needs a second money flow beside the ledger.
- **A seat with a fixed ID and no player record**: it has chips, hands and a result like any player, so the ledger, the table balance and settlement all work unchanged.

## Decision

- `INSURANCE_PLAYER_ID` is a seat in the ledger with no record in `players`. Its name 保险 is reserved, so no player can take it. Reports and the player list never see it, and backups accept the ID as a valid player.
- A game with insurance seats it with one hand. The seat always shows last, cannot leave by hand, and leaves with the last players at settlement. `insuranceSeatChange` keeps it in step with the settings until it has sold anything, and `hasPlayerEvents` stops its buy-in from locking the chip ratio.
- `insurance_buy` moves the premium from the player to the seat. `insurance_settle` records the result and, on a hit, moves the payout back. Reversing either undoes its movement.
- All-in players often have nothing behind, so a premium takes only what the stack holds. The table balance then shows the gap until the organizer types the stacks after the hand.
- If the seat cannot pay, enough whole hands are bought in the same write. An undo leaves those hands bought.
- At settlement `attributeInsurance` moves the seat's result to the organizer (default), a chosen player, or leaves it on its own row. `chipDifference` no longer takes an insurance term.
- Each game keeps a copy of its `InsuranceRule`, so editing or deleting a saved rule changes no game. Saved rules are a new table, and backups move to version 3. Older backups still restore.
- Odds are stored as whole hundredths, so prices never touch floating-point arithmetic. Premiums round up and payouts round down to whole chips.
- `packages/core/src/insurance` has its own hand evaluator, checked against the known frequency of all 2,598,960 five-card hands. Outs are found by dealing every unseen card to each pot's eligible players, so a card two opponents hit counts once.

## Consequences

- Insurance covers the next card only. A flop all-in buys the turn, then the river as a new purchase. Pricing two cards at once would need a second odds table.
- Folded players' cards stay in the deck and count as outs, because the organizer does not know them.
- The calculator's input is not saved, so leaving the page clears the hand being entered. Purchases are saved as soon as they are recorded.
- The Supabase implementation (M6) needs the `insuranceRules` table, and must accept the seat's ID in ledger foreign keys.
