import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cents } from "../money";
import {
  createGame,
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
  type GameSettingsForm,
  handChipsFor,
  parseGameSettings,
  reopenGame,
  settleGame,
  toGameSettingsForm,
  updateGameSettings,
} from "./game";

const form: GameSettingsForm = {
  currency: "CNY",
  smallBlind: "5",
  bigBlind: "10.50",
  ratioChips: "1,000",
  ratioAmount: "10",
  buyInBigBlinds: "100",
};

const meta = { id: "g1", organizerId: "me", createdAt: 1 };

describe("parseGameSettings", () => {
  it("把表单字符串转成整数", () => {
    expect(parseGameSettings(form)).toEqual({
      ok: true,
      settings: {
        currency: "CNY",
        smallBlind: cents(500),
        bigBlind: cents(1050),
        chipRatio: { chips: 1000, amount: cents(1000) },
        buyInBigBlinds: 100,
      },
    });
  });

  it("报告所有无法解析或不是正数的字段", () => {
    const result = parseGameSettings({
      ...form,
      smallBlind: "abc",
      bigBlind: "0",
      ratioChips: "1.5",
      ratioAmount: "-1",
      buyInBigBlinds: "0",
    });
    expect(result).toEqual({
      ok: false,
      issues: {
        smallBlind: "invalid",
        bigBlind: "not-positive",
        ratioChips: "invalid",
        ratioAmount: "not-positive",
        buyInBigBlinds: "not-positive",
      },
    });
  });

  it("大盲不能小于小盲，可以相等", () => {
    expect(parseGameSettings({ ...form, smallBlind: "11", bigBlind: "10" })).toEqual({
      ok: false,
      issues: { bigBlind: "below-small-blind" },
    });
    expect(parseGameSettings({ ...form, smallBlind: "10", bigBlind: "10" }).ok).toBe(true);
  });

  it("筹码数超出安全整数范围时视为无效", () => {
    expect(parseGameSettings({ ...form, ratioChips: "99999999999999999" })).toEqual({
      ok: false,
      issues: { ratioChips: "invalid" },
    });
  });

  it("1 手换算不出整数筹码时报错", () => {
    const whole = { ...form, ratioChips: "1", ratioAmount: "5", bigBlind: "10.50" };
    expect(parseGameSettings({ ...whole, buyInBigBlinds: "3" })).toEqual({
      ok: false,
      issues: { buyInBigBlinds: "not-whole-chips" },
    });
    expect(parseGameSettings({ ...whole, buyInBigBlinds: "10" }).ok).toBe(true);
  });

  it("买入已固定时不再检查换算结果，改盲注不受影响", () => {
    const locked = { ...form, ratioChips: "1", ratioAmount: "5", buyInBigBlinds: "3" };
    expect(parseGameSettings(locked).ok).toBe(false);
    expect(parseGameSettings(locked, { buyInLocked: true }).ok).toBe(true);
  });

  it("任意合法设置经过表单往返后不变", () => {
    const positiveCents = fc.integer({ min: 1, max: 100_000 }).map(cents);
    const settings = fc
      .record({
        currency: fc.constantFrom("AUD" as const, "CNY" as const),
        smallBlind: positiveCents,
        extra: fc.integer({ min: 0, max: 100_000 }),
        multiple: fc.integer({ min: 1, max: 100 }),
        amount: positiveCents,
        buyInBigBlinds: fc.integer({ min: 1, max: 1_000 }),
      })
      .map(
        ({ currency, smallBlind, extra, multiple, amount, buyInBigBlinds }): GameSettings => ({
          currency,
          smallBlind,
          bigBlind: cents(smallBlind + extra),
          // 筹码数是金额的整数倍，保证 1 手能换算成整数筹码
          chipRatio: { chips: amount * multiple, amount },
          buyInBigBlinds,
        }),
      );
    fc.assert(
      fc.property(settings, (value) => {
        expect(parseGameSettings(toGameSettingsForm(value))).toEqual({ ok: true, settings: value });
      }),
    );
  });
});

describe("DEFAULT_GAME_SETTINGS", () => {
  it("默认人民币，1 筹码 = 1 元，一个买入 100 个大盲", () => {
    expect(DEFAULT_GAME_SETTINGS).toMatchObject({
      currency: "CNY",
      chipRatio: { chips: 1, amount: cents(100) },
      buyInBigBlinds: 100,
    });
  });
});

describe("toGameSettingsForm", () => {
  it("旧牌局没有买入设置时用默认值", () => {
    const { buyInBigBlinds: _, ...old } = DEFAULT_GAME_SETTINGS;
    expect(toGameSettingsForm(old).buyInBigBlinds).toBe("100");
  });
});

describe("handChipsFor", () => {
  it("大盲 × 倍数，再按比例换算成筹码", () => {
    const ratio = { chips: 100, amount: cents(100) };
    expect(handChipsFor({ bigBlind: cents(200), chipRatio: ratio, buyInBigBlinds: 100 })).toBe(
      20_000,
    );
  });
});

describe("createGame", () => {
  it("新牌局是进行中状态，并固定 1 手的筹码数", () => {
    expect(createGame(meta, DEFAULT_GAME_SETTINGS)).toEqual({
      ...meta,
      ...DEFAULT_GAME_SETTINGS,
      handChips: 200,
      status: "open",
    });
  });
});

describe("settleGame / reopenGame", () => {
  const game = createGame(meta, DEFAULT_GAME_SETTINGS);

  it("结算后记录时间，重新打开后恢复原样", () => {
    const settled = settleGame(game, 2);
    expect(settled).toEqual({ ...game, status: "settled", settledAt: 2 });
    expect(reopenGame(settled)).toEqual(game);
  });
});

describe("updateGameSettings", () => {
  const game = createGame(meta, DEFAULT_GAME_SETTINGS);
  const next: GameSettings = {
    currency: "CNY",
    smallBlind: cents(500),
    bigBlind: cents(1000),
    chipRatio: { chips: 10, amount: cents(100) },
    buyInBigBlinds: 50,
  };

  it("没有账本事件时可以改全部设置", () => {
    expect(updateGameSettings(game, next, { hasLedgerEvents: false })).toEqual({
      ...game,
      ...next,
      handChips: 5000,
    });
  });

  it("有账本事件后只改盲注，货币、筹码比例和 1 手不变", () => {
    expect(updateGameSettings(game, next, { hasLedgerEvents: true })).toEqual({
      ...game,
      smallBlind: next.smallBlind,
      bigBlind: next.bigBlind,
    });
  });
});
