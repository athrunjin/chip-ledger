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

### #I-005 Collapsible game record

- Type: feature
- Date: proposed and decided 2026-11-04
- Source: discussion
- Problem: the ledger history takes up space below the player list during a game.
- Proposal:
  - Rename 流水 to 牌局记录 (game record), collapsed by default, with a record count in the header.
  - Tap the header to expand or collapse it. A long list also gets a collapse button at the bottom, so nobody has to scroll back up.
  - Collapsing and expanding is view state only and doesn't touch the ledger.
- Decision: do.
- Tracking: no issue yet

### #I-006 Set blinds in chips

- Type: feature
- Date: proposed and decided 2026-11-04
- Source: discussion
- Problem: blinds are entered as money, but players at the table think in chips.
- Proposal:
  - Enter small and big blinds in chips, with the cash equivalent shown under the fields.
  - Store blinds as chips on `Game`. Chips per hand become multiple × big blind chips, so the "not a whole number of chips" error goes away.
  - Show blinds without a currency, for example `1 / 2`, on the game list, game page and settlement image.
- Impact: changes the data model, so it needs an ADR, a local database upgrade and a new backup version that still reads version 1 files.
  Older games are converted with their chip ratio.
- Settled details: blinds are whole chips, matching the ledger. At 1:1 a ¥0.5 small blind needs a different chip ratio.
- Decision: do.
- Tracking: no issue yet

### #I-007 Live stack and win/loss on each player row

- Type: feature
- Date: proposed and decided 2026-11-04
- Source: discussion
- Problem: the organizer can see what each player bought but not where they stand now.
- Proposal:
  - Add a chip cell to each seated player's row. It starts at the amount bought, and tapping it lets you type a new value.
  - Show win/loss as chips − bought, with a sign and a color: + in one color, − in another, and 0 neutral. It replaces the bought amount under the name.
  - Once a stack has been typed, changing hands adds or subtracts directly, with a minimum of 0.
    Example with 500 chips per hand: King is at 700, one more hand makes 1200, and one hand fewer from 700 makes 200.
- Ledger rules: a new append-only `stack_set` event records each typed value, so it can be undone like other records.
  Replaying events has to apply a reversed buy as a change to the stack at that point, or the example above would stay at 700.
- Layout: at 375px there's about 57px left for the name (about 3 Chinese characters) after the stack cell, hand controls and leave button. Longer names are truncated. To be checked on a real device.
- Impact: new event type in the backup format; needs an ADR.
- Settled details:
  - Win/loss and the table balance are in chips, matching the stack next to them.
  - Typed stacks appear in the game record, so they can be audited and undone. Tapping the chip cell opens a small dialog, like tapping the hand count.
  - Each player keeps one row with short names, because two rows would fit only about 6–7 players on a screen.
- Decision: do.
- Tracking: no issue yet

### #I-008 Rename cash out to leave table, with a confirmation dialog

- Type: feature
- Date: proposed and decided 2026-11-04
- Source: discussion
- Problem: leaving the table needs a final check of hands and chips, and today the dialog only asks for chips.
- Proposal:
  - Rename 兑出 to 离桌 (leave table) across the game page, game record and settlement notice.
  - The dialog shows the player's current hands and chips, both adjustable. Chips start at the current stack, and changing hands follows the #I-007 rule.
  - Confirming records the cash-out and moves the player to the left section. Cancelling changes nothing.
- Depends on: #I-007
- Decision: do.
- Tracking: no issue yet

### #I-009 Live table balance

- Type: feature
- Date: proposed and decided 2026-11-04
- Source: discussion
- Problem: mistakes in stacks only show up at settlement, after everyone has left.
- Proposal:
  - Replace the 场上 (in play) tile with a live balance: chips cashed out + seated stacks − chips bought.
  - 0 means the table balances. Any other value shows its sign in a warning color.
  - The balance stays at 0 until a stack is typed. After a win is entered, it stays off until the matching losses are entered too.
- Depends on: #I-007
- Decision: do.
- Tracking: no issue yet

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
