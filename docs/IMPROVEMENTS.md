# Improvement log

Records discussions of feature and process improvements: what was proposed, how it was decided and why.

- When work starts, create a GitHub issue and add its number to the entry. Scheduling still follows the [roadmap](ROADMAP.md).
- Confirmed rules go in [CONTEXT](CONTEXT.md), and decisions that affect the long-term structure go in an [ADR](adr/). This file only links to them.
- Entry numbers increase and are never reused. When an entry's status changes, move it to the matching section and keep its content.

## Entry format

```markdown
### #I-001 Title

- Type: feature / process
- Date: date proposed, followed by the decision date
- Source: live game trial / everyday use / discussion
- Problem: what's wrong today and in what situation
- Proposal: what to change; list candidates if undecided
- Decision: do / don't do / defer, and why
- Tracking: issue, PR and ADR links
```

## Under discussion

(none)

## Decided, waiting for development

(none)

## Done

### #I-001 Default game settings: CNY and a 1:1 chip ratio

- Type: feature
- Date: proposed, decided and completed 2026-11-04
- Source: discussion
- Problem: the defaults were AUD and 100 chips = 1 unit of currency, which didn't match how games are actually run.
- Proposal:
  - A new game carries over the last game's settings. This already worked and needed no change.
  - With no previous game, default to CNY and 1 chip = 1 yuan. The rule is recorded in CONTEXT.
- Note: `DEFAULT_GAME_SETTINGS` only applies when there are no games at all. On a phone with existing games,
  new games still carry over the old settings, so CNY and 1:1 have to be selected once by hand.
- Decision: do. Released after passing a trial on a real device with the preview build.
- Tracking: issue #20, PR #23

### #I-002 Buying in by hands

- Type: feature
- Date: proposed, decided and completed 2026-11-04
- Source: discussion
- Problem: buy-ins and rebuys both needed a typed chip count, which is slow at the table.
- Proposal:
  - Add "one buy-in = xx big blinds" to game settings. It defaults to 100 big blinds and carries over from the last game.
  - Chips per hand = multiple × big blind amount, converted with the chip ratio. If the result isn't a whole number of chips, the settings page shows an error.
  - After adding a player, choose how many hands they buy: a whole number, default 1, using +/− or by typing. The matching chips and amount are shown.
  - Ledger events still record chips. Hands are only for entry and display, so settlement doesn't change.
  - Cash-outs are still entered in chips, because a stack at the end usually isn't a whole number of hands.
  - Changing blinds mid-game follows the temporary approach in #I-004: chips per hand stop changing after the first record.
- Impact: `Game` gains optional fields and the backup format adds them too. The data model change gets an ADR, as the standards require.
  Older games without these fields keep recording chips.
- Decision: do. Released after passing a trial on a real device with the preview build.
- Tracking: issue #21, PR #23, [ADR 0010](adr/0010-buy-in-hands.md)

### #I-003 One row per seated player and quick rebuys

- Type: feature
- Date: proposed, decided and completed 2026-11-04
- Source: discussion
- Problem: each player took a three-line card, so a full table didn't fit on one screen, and a rebuy meant opening a dialog and typing.
- Proposal:
  - One row per player, with at least 8–9 seated players on one screen.
  - Each row has the name, the hand count with − and + on either side, and cash out. Total bought in appears in small text under the name.
  - Tapping + or − changes the count by 1 hand. Tapping the count lets you type a target. Both take effect immediately with no confirmation.
  - Players who have left go at the bottom of the list in a separate section, set apart from seated players. They can still rebuy to sit back down.
  - Estimated for a 375px wide phone: about 150px for the name and a row height of about 52px, meeting the 44px touch target. Measured at 375×812: 9 players fit on one screen.
  - "Add player" moves above the list, with suggestions collapsed until the field is tapped. "Settle" moves to the top right of the page.
- Ledger rules: the ledger is append-only, so numbers can't be edited directly.
  - Increase: record a rebuy for the added hands.
  - Decrease: reverse the latest buys. If that takes off too much, record the difference again,
    and write both in the same transaction.
  - At least 1 hand always remains. To cancel a buy-in completely, undo it from the log.
- Decision: do. Released after passing a trial on a real device with the preview build.
- Depends on: #I-002
- Tracking: issue #22, PR #23, [ADR 0010](adr/0010-buy-in-hands.md)

## Not doing or deferred

### #I-004 Hand size when blinds change mid-game

- Type: feature
- Date: proposed and deferred 2026-11-04
- Source: discussion
- Problem: after blinds change mid-game, should the chips behind "one buy-in = xx big blinds" change too?
- Proposal:
  - Temporary approach: chips per hand are fixed after the first record, and changing blinds doesn't affect hands.
    This is the smallest change and keeps "3 hands" meaning the same thing throughout a game.
  - If needed later, add "adjust chips per hand", affecting only later buy-ins and leaving existing records in chips.
  - This is close to how tournaments work: blinds rise by level, while the rebuy stack is set before the start.
    That comes from general knowledge; how other apps handle it hasn't been checked.
- Decision: defer. Blinds rarely change, so this isn't a priority for now.
- Tracking: no issue yet
