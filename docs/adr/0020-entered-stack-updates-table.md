# 0020. An all-in player's entered chips update the table at once

- Status: Accepted
- Date: 2026-11-06

## Context

The chips entered for an all-in player are counted at the table, so they are more reliable than the game's stack, which may date from before earlier hands. ADR 0015 and 0017 kept stacks unchanged until a hand finished, so the game showed an old figure during the hand.

## Decision

- Confirming a player other than the cover writes their chips to the game as a plain `stack_set`, if the stack differs.
- This event has no `handId`. It records a count, not a result of the hand, so it stays if the hand is discarded or undone.
- These players' chips are their whole stack. Finishing the hand still replaces that stack with what they end with.
- A cover player's chips are unknown, so nothing is written for them.
- Premiums and payouts still move nothing until the hand is finished.

## Consequences

- The table balance can change while a hand is open, when an entered stack differs from the game's.
- A mistyped amount reaches the table, and correcting the player writes the stack again. Removing a player from the hand leaves the stack as entered.
