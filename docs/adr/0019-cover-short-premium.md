# 0019. A cover player can be short of a premium too

- Status: Accepted
- Date: 2026-11-06

## Context

ADR 0017 gave a cover player no stack, assuming they always had chips behind. A cover can have barely more than the next deepest player, or the same. If they then lost the pot and missed their insurance, the premium went unpaid with no prompt, and their stack stayed as it was.

## Decision

- `playerHandResults` takes the stacks from before the hand. A cover's chips behind are that stack less their stake, and they are short if those chips and their winnings cannot pay their premiums.
- A short cover goes through the same prompt as ADR 0018, and their stack is set to what is left of the buy-in.
- Any other cover still gets no stack, as in ADR 0017.
- The standalone calculator knows no stacks, so it never reports a cover as short.

## Consequences

- This relies on the table's stack being current before the hand. A stale stack can hide a shortfall or report one that is not there.
