import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { ChipEvent, LedgerEvent, ReversalEvent } from "../domain";
import { cents } from "../money";
import {
  activeChipEvents,
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
  it("累计买入、补码和兑出，按首次买入排序", () => {
    const events = [
      chip("1", "buy_in", "a", 1000),
      chip("2", "buy_in", "b", 500),
      chip("3", "rebuy", "a", 200),
      chip("4", "cash_out", "b", 800),
    ];
    expect(summarizeByPlayer(events)).toEqual([
      { playerId: "a", boughtChips: 1200, cashedOutChips: 0, seated: true },
      { playerId: "b", boughtChips: 500, cashedOutChips: 800, seated: false },
    ]);
  });

  it("兑出后再补码，回到桌上", () => {
    const events = [
      chip("1", "buy_in", "a", 1000),
      chip("2", "cash_out", "a", 0),
      chip("3", "rebuy", "a", 500),
    ];
    expect(summarizeByPlayer(events)[0]?.seated).toBe(true);
  });

  it("被冲正的事件不计入，玩家全部冲正后不再出现", () => {
    const events = [chip("1", "buy_in", "a", 1000), reversal("2", "1")];
    expect(summarizeByPlayer(events)).toEqual([]);
  });

  it("追加冲正后，账目回到这笔事件之前的状态", () => {
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
  it("过滤掉冲正事件和被冲正的事件，保持顺序", () => {
    const kept = chip("2", "rebuy", "a", 200);
    const events = [chip("1", "buy_in", "a", 1000), kept, reversal("3", "1")];
    expect(activeChipEvents(events)).toEqual([kept]);
  });
});

describe("canReverse", () => {
  const events = [chip("1", "buy_in", "a", 1000), chip("2", "rebuy", "a", 200), reversal("3", "1")];

  it("还没被冲正的筹码事件可以撤销", () => {
    expect(canReverse(events, "2")).toBe(true);
  });

  it("已冲正的事件、冲正事件和不存在的事件不能撤销", () => {
    expect(canReverse(events, "1")).toBe(false);
    expect(canReverse(events, "3")).toBe(false);
    expect(canReverse(events, "nope")).toBe(false);
  });
});

describe("ledgerTotals", () => {
  it("场上筹码 = 买入 − 兑出", () => {
    const players = summarizeByPlayer([
      chip("1", "buy_in", "a", 1000),
      chip("2", "buy_in", "b", 500),
      chip("3", "cash_out", "b", 300),
    ]);
    expect(ledgerTotals(players)).toEqual({
      boughtChips: 1500,
      cashedOutChips: 300,
      inPlayChips: 1200,
    });
  });
});

describe("nextBuyType", () => {
  it("第一笔是买入，之后是补码", () => {
    const events = [chip("1", "buy_in", "a", 1000)];
    expect(nextBuyType(events, "b")).toBe("buy_in");
    expect(nextBuyType(events, "a")).toBe("rebuy");
  });

  it("唯一一笔被撤销后，下一笔还是买入", () => {
    const events = [chip("1", "buy_in", "a", 1000), reversal("2", "1")];
    expect(nextBuyType(events, "a")).toBe("buy_in");
  });
});

describe("lastBuyChips", () => {
  it("取最近一笔没被撤销的买入或补码，跳过兑出", () => {
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
  it("按比例换算并四舍五入到分", () => {
    expect(chipsToCents(1000, { chips: 100, amount: cents(100) })).toBe(1000);
    expect(chipsToCents(1, { chips: 3, amount: cents(100) })).toBe(33);
    expect(chipsToCents(2, { chips: 3, amount: cents(100) })).toBe(67);
  });
});
