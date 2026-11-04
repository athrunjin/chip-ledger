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

describe("adjustHands", () => {
  const hand = 200;

  it("第一次买入记 buy_in", () => {
    expect(adjustHands([], "a", hand, { to: 2 })).toEqual({
      reversedEventIds: [],
      buy: { type: "buy_in", chips: 400 },
    });
  });

  it("增加时记一笔差额的补码", () => {
    const events = [chip("1", "buy_in", "a", 200)];
    expect(adjustHands(events, "a", hand, { by: 1 }).buy).toEqual({ type: "rebuy", chips: 200 });
    expect(adjustHands(events, "a", hand, { to: 4 }).buy).toEqual({ type: "rebuy", chips: 600 });
  });

  it("减少时冲正最近的补码", () => {
    const events = [chip("1", "buy_in", "a", 200), chip("2", "rebuy", "a", 200)];
    expect(adjustHands(events, "a", hand, { by: -1 })).toEqual({ reversedEventIds: ["2"] });
  });

  it("那一笔超过要减的手数时，冲正后补回差额", () => {
    const events = [chip("1", "buy_in", "a", 200), chip("2", "rebuy", "a", 600)];
    expect(adjustHands(events, "a", hand, { to: 2 })).toEqual({
      reversedEventIds: ["2"],
      buy: { type: "rebuy", chips: 200 },
    });
  });

  it("首次买入也被冲正时，补回的那笔仍是 buy_in", () => {
    const events = [chip("1", "buy_in", "a", 600)];
    expect(adjustHands(events, "a", hand, { to: 1 })).toEqual({
      reversedEventIds: ["1"],
      buy: { type: "buy_in", chips: 200 },
    });
  });

  it("最少保留 1 手，手数没变时不产生事件", () => {
    const events = [chip("1", "buy_in", "a", 200)];
    expect(adjustHands(events, "a", hand, { by: -1 })).toEqual({ reversedEventIds: [] });
    expect(adjustHands(events, "a", hand, { to: 1 })).toEqual({ reversedEventIds: [] });
  });

  it("跳过已撤销的记录和其他玩家", () => {
    const events = [
      chip("1", "buy_in", "a", 200),
      chip("2", "rebuy", "a", 200),
      reversal("r", "2"),
      chip("3", "buy_in", "b", 200),
    ];
    expect(adjustHands(events, "a", hand, { to: 3 }).buy?.chips).toBe(400);
  });

  it("任意调整后买入总额等于目标手数", () => {
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
