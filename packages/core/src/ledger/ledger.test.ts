import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { ChipEvent, LedgerEvent, ReversalEvent } from "../domain";
import { cents } from "../money";
import {
  activeChipEvents,
  adjustHands,
  canReverse,
  chipsToCents,
  lastBuyChips,
  ledgerTotals,
  nextBuyType,
  summarizeByPlayer,
} from "./ledger";

const base = { organizerId: "me", gameId: "g1", occurredAt: 1 };

const chip = (id: string, type: ChipEvent["type"], playerId: string, chips: number): ChipEvent => ({
  ...base,
  id,
  type,
  playerId,
  chips,
});

const reversal = (id: string, reversedEventId: string): ReversalEvent => ({
  ...base,
  id,
  type: "reversal",
  reversedEventId,
});

describe("summarizeByPlayer", () => {
  it("adds up buy-ins, rebuys and cash-outs, ordered by first buy-in", () => {
    const events = [
      chip("1", "buy_in", "a", 1000),
      chip("2", "buy_in", "b", 500),
      chip("3", "rebuy", "a", 200),
      chip("4", "cash_out", "b", 800),
    ];
    expect(summarizeByPlayer(events)).toEqual([
      {
        playerId: "a",
        boughtChips: 1200,
        cashedOutChips: 0,
        seated: true,
        stackChips: 1200,
        netChips: 0,
      },
      {
        playerId: "b",
        boughtChips: 500,
        cashedOutChips: 800,
        seated: false,
        stackChips: 0,
        netChips: 300,
      },
    ]);
  });

  it("seats a player again on a rebuy after cashing out", () => {
    const events = [
      chip("1", "buy_in", "a", 1000),
      chip("2", "cash_out", "a", 0),
      chip("3", "rebuy", "a", 500),
    ];
    expect(summarizeByPlayer(events)[0]?.seated).toBe(true);
  });

  it("ignores reversed events and drops fully reversed players", () => {
    const events = [chip("1", "buy_in", "a", 1000), reversal("2", "1")];
    expect(summarizeByPlayer(events)).toEqual([]);
  });

  it("returns to the state before an event once it is reversed", () => {
    const anyEvent = fc.record({
      type: fc.constantFrom<ChipEvent["type"]>("buy_in", "rebuy", "cash_out"),
      playerId: fc.constantFrom("a", "b", "c"),
      chips: fc.integer({ min: 0, max: 1_000_000 }),
    });
    fc.assert(
      fc.property(fc.array(anyEvent), anyEvent, (history, last) => {
        const before: LedgerEvent[] = history.map((e, i) => ({ ...base, ...e, id: `e${i}` }));
        const event = { ...base, ...last, id: "last" };
        const after = [...before, event, reversal("r", "last")];
        expect(summarizeByPlayer(after)).toEqual(summarizeByPlayer(before));
      }),
    );
  });
});

describe("activeChipEvents", () => {
  it("filters out reversals and reversed events, keeping the order", () => {
    const kept = chip("2", "rebuy", "a", 200);
    const events = [chip("1", "buy_in", "a", 1000), kept, reversal("3", "1")];
    expect(activeChipEvents(events)).toEqual([kept]);
  });
});

describe("canReverse", () => {
  const events = [chip("1", "buy_in", "a", 1000), chip("2", "rebuy", "a", 200), reversal("3", "1")];

  it("allows undoing chip events not yet reversed", () => {
    expect(canReverse(events, "2")).toBe(true);
  });

  it("refuses reversed events, reversals and unknown events", () => {
    expect(canReverse(events, "1")).toBe(false);
    expect(canReverse(events, "3")).toBe(false);
    expect(canReverse(events, "nope")).toBe(false);
  });
});

describe("ledgerTotals", () => {
  it("adds up totals and the table balance", () => {
    const players = summarizeByPlayer([
      chip("1", "buy_in", "a", 1000),
      chip("2", "buy_in", "b", 500),
      chip("3", "cash_out", "b", 300),
    ]);
    expect(ledgerTotals(players)).toEqual({
      boughtChips: 1500,
      cashedOutChips: 300,
      balanceChips: -200,
    });
  });
});

describe("nextBuyType", () => {
  it("treats the first as a buy-in and later ones as rebuys", () => {
    const events = [chip("1", "buy_in", "a", 1000)];
    expect(nextBuyType(events, "b")).toBe("buy_in");
    expect(nextBuyType(events, "a")).toBe("rebuy");
  });

  it("still treats the next as a buy-in after the only one is undone", () => {
    const events = [chip("1", "buy_in", "a", 1000), reversal("2", "1")];
    expect(nextBuyType(events, "a")).toBe("buy_in");
  });
});

describe("lastBuyChips", () => {
  it("takes the latest buy not undone, skipping cash-outs", () => {
    const events = [
      chip("1", "buy_in", "a", 1000),
      chip("2", "rebuy", "a", 500),
      chip("3", "cash_out", "a", 100),
      chip("4", "rebuy", "b", 300),
      reversal("5", "4"),
    ];
    expect(lastBuyChips(events)).toBe(500);
    expect(lastBuyChips([])).toBeUndefined();
  });
});

describe("chipsToCents", () => {
  it("converts at the ratio and rounds to the cent", () => {
    expect(chipsToCents(1000, { chips: 100, amount: cents(100) })).toBe(1000);
    expect(chipsToCents(1, { chips: 3, amount: cents(100) })).toBe(33);
    expect(chipsToCents(2, { chips: 3, amount: cents(100) })).toBe(67);
  });
});

describe("adjustHands", () => {
  const hand = 200;

  it("records buy_in for a first purchase", () => {
    expect(adjustHands([], "a", hand, { to: 2 })).toEqual({
      reversedEventIds: [],
      buy: { type: "buy_in", chips: 400 },
    });
  });

  it("records a rebuy for the difference on an increase", () => {
    const events = [chip("1", "buy_in", "a", 200)];
    expect(adjustHands(events, "a", hand, { by: 1 }).buy).toEqual({ type: "rebuy", chips: 200 });
    expect(adjustHands(events, "a", hand, { to: 4 }).buy).toEqual({ type: "rebuy", chips: 600 });
  });

  it("reverses the latest rebuy on a decrease", () => {
    const events = [chip("1", "buy_in", "a", 200), chip("2", "rebuy", "a", 200)];
    expect(adjustHands(events, "a", hand, { by: -1 })).toEqual({ reversedEventIds: ["2"] });
  });

  it("records the difference again when the reversal takes off too much", () => {
    const events = [chip("1", "buy_in", "a", 200), chip("2", "rebuy", "a", 600)];
    expect(adjustHands(events, "a", hand, { to: 2 })).toEqual({
      reversedEventIds: ["2"],
      buy: { type: "rebuy", chips: 200 },
    });
  });

  it("keeps buy_in when the first buy-in is reversed too", () => {
    const events = [chip("1", "buy_in", "a", 600)];
    expect(adjustHands(events, "a", hand, { to: 1 })).toEqual({
      reversedEventIds: ["1"],
      buy: { type: "buy_in", chips: 200 },
    });
  });

  it("keeps at least 1 hand and appends nothing when unchanged", () => {
    const events = [chip("1", "buy_in", "a", 200)];
    expect(adjustHands(events, "a", hand, { by: -1 })).toEqual({ reversedEventIds: [] });
    expect(adjustHands(events, "a", hand, { to: 1 })).toEqual({ reversedEventIds: [] });
  });

  it("skips undone records and other players", () => {
    const events = [
      chip("1", "buy_in", "a", 200),
      chip("2", "rebuy", "a", 200),
      reversal("r", "2"),
      chip("3", "buy_in", "b", 200),
    ];
    expect(adjustHands(events, "a", hand, { to: 3 }).buy?.chips).toBe(400);
  });

  it("reaches the target hands after any adjustment", () => {
    const hands = fc.integer({ min: 1, max: 20 });
    fc.assert(
      fc.property(fc.array(hands, { minLength: 1, maxLength: 10 }), hands, (buys, target) => {
        const events: LedgerEvent[] = buys.map((n, i) =>
          chip(`e${i}`, i === 0 ? "buy_in" : "rebuy", "a", n * hand),
        );
        const { reversedEventIds, buy } = adjustHands(events, "a", hand, { to: target });
        const next: LedgerEvent[] = [
          ...events,
          ...reversedEventIds.map((id) => reversal(`r-${id}`, id)),
          ...(buy ? [chip("new", buy.type, "a", buy.chips)] : []),
        ];
        expect(summarizeByPlayer(next)[0]?.boughtChips).toBe(target * hand);
      }),
    );
  });
});

describe("live stacks", () => {
  const at = (occurredAt: number, event: LedgerEvent): LedgerEvent => ({ ...event, occurredAt });
  const stackSet = (
    id: string,
    chips: number,
    occurredAt: number,
    playerId = "a",
  ): LedgerEvent => ({
    ...base,
    id,
    type: "stack_set",
    playerId,
    chips,
    occurredAt,
  });
  const stackOf = (events: readonly LedgerEvent[]) => summarizeByPlayer(events)[0]?.stackChips;

  it("starts at the amount bought and adds buys", () => {
    const events = [at(1, chip("1", "buy_in", "a", 500)), at(2, chip("2", "rebuy", "a", 500))];
    expect(summarizeByPlayer(events)[0]).toMatchObject({ stackChips: 1000, netChips: 0 });
  });

  it("uses a typed stack and shows the win or loss", () => {
    const events = [at(1, chip("1", "buy_in", "a", 500)), stackSet("s", 700, 2)];
    expect(summarizeByPlayer(events)[0]).toMatchObject({ stackChips: 700, netChips: 200 });
  });

  it("adds a hand to a typed stack: 700 becomes 1200", () => {
    const events = [
      at(1, chip("1", "buy_in", "a", 500)),
      stackSet("s", 700, 2),
      at(3, chip("2", "rebuy", "a", 500)),
    ];
    expect(stackOf(events)).toBe(1200);
  });

  it("removes a hand from a typed stack, even one bought earlier: 700 becomes 200", () => {
    const events = [
      at(1, chip("1", "buy_in", "a", 500)),
      at(2, chip("2", "rebuy", "a", 500)),
      stackSet("s", 700, 3),
      at(4, reversal("r", "2")),
    ];
    expect(stackOf(events)).toBe(200);
  });

  it("never goes below 0", () => {
    const events = [
      at(1, chip("1", "buy_in", "a", 500)),
      at(2, chip("2", "rebuy", "a", 500)),
      stackSet("s", 100, 3),
      at(4, reversal("r", "2")),
    ];
    expect(stackOf(events)).toBe(0);
  });

  it("treats a reversal and its replacement buy as one change", () => {
    const events = [
      at(1, chip("1", "buy_in", "a", 1500)),
      stackSet("s", 700, 2),
      at(3, reversal("r", "1")),
      at(3, chip("2", "buy_in", "a", 1000)),
    ];
    expect(stackOf(events)).toBe(200);
  });

  it("restores the previous stack when a typed stack is undone", () => {
    const events = [
      at(1, chip("1", "buy_in", "a", 500)),
      stackSet("s", 700, 2),
      at(3, chip("2", "rebuy", "a", 500)),
      at(4, reversal("r", "s")),
    ];
    expect(stackOf(events)).toBe(1000);
  });

  it("is 0 after leaving and restored if leaving is undone", () => {
    const left = [at(1, chip("1", "buy_in", "a", 500)), at(2, chip("2", "cash_out", "a", 600))];
    expect(summarizeByPlayer(left)[0]).toMatchObject({ stackChips: 0, netChips: 100 });
    expect(stackOf([...left, at(3, reversal("r", "2"))])).toBe(500);
  });

  it("counts earlier cash-outs in the win or loss after sitting back down", () => {
    const events = [
      at(1, chip("1", "buy_in", "a", 500)),
      at(2, chip("2", "cash_out", "a", 800)),
      at(3, chip("3", "rebuy", "a", 500)),
    ];
    expect(summarizeByPlayer(events)[0]).toMatchObject({ stackChips: 500, netChips: 300 });
  });

  it("does not treat a typed stack as a buy or a cash-out", () => {
    const events = [at(1, chip("1", "buy_in", "a", 500)), stackSet("s", 0, 2)];
    expect(summarizeByPlayer(events)[0]).toMatchObject({ boughtChips: 500, seated: true });
    expect(canReverse(events, "s")).toBe(true);
  });

  it("shows an imbalance until wins and losses are both entered", () => {
    const buys = [at(1, chip("1", "buy_in", "a", 500)), at(1, chip("2", "buy_in", "b", 500))];
    const win = [...buys, stackSet("s1", 700, 2)];
    expect(ledgerTotals(summarizeByPlayer(win)).balanceChips).toBe(200);
    const both = [...win, stackSet("s2", 300, 3, "b")];
    expect(ledgerTotals(summarizeByPlayer(both)).balanceChips).toBe(0);
  });
});
