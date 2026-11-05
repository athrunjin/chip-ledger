# 0013. Allow settling unbalanced books

- Status: Accepted
- Date: 2026-11-05

## Context

Settlement used to refuse books whose chips don't balance. At a live game a difference sometimes can't be traced, and the game still has to end.

## Options considered

- Keep blocking: the organizer has no way to finish when a mistake can't be found.
- Add a correcting ledger event: it rewrites what happened at the table to make the numbers fit.
- **Keep the ledger as recorded and save how to handle the difference**: the record stays honest, and the handling can be changed later.

## Decision

- `Game` gains an optional `imbalanceHandling`: `split`, `organizer` or `ignore`. It's only used when the books don't balance, and they always need a choice first.
- `settlementOutcome` replaces `netCents` for display. It returns results after handling, the cash difference and any unresolved part.
- `split` takes the difference off the side that is too large, in proportion to each player's result, using `allocate`. Winners give up part of an excess, and losers pay less when chips are left over. Results add up to exactly 0, and nobody moves past 0.
- `organizer` adds a `ORGANIZER_COLLECTOR` entry to the results, so both transfer plans treat them as a party.
- `ignore` leaves results as they are. Transfers pay as far as they can, and the unresolved amount is shown.
- `netCents` still refuses unbalanced books, for callers that need a guarantee.
- The backup format stays at version 2 because the field is optional.

## Consequences

- With `ignore`, the optimal plan leaves whoever is settled last short, and a collector plan leaves the difference with the collector. The interface says so.
- Win/loss in chips keeps the real figures, so it can differ from the adjusted cash amount.
