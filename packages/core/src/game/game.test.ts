import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cents } from "../money";
import {
  createGame,
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
  type GameSettingsForm,
  parseGameSettings,
  toGameSettingsForm,
  updateGameSettings,
} from "./game";

const form: GameSettingsForm = {
  currency: "CNY",
  smallBlind: "5",
  bigBlind: "10.50",
  ratioChips: "1,000",
  ratioAmount: "10",
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
    });
    expect(result).toEqual({
      ok: false,
      issues: {
        smallBlind: "invalid",
        bigBlind: "not-positive",
        ratioChips: "invalid",
        ratioAmount: "not-positive",
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

  it("任意合法设置经过表单往返后不变", () => {
    const positiveCents = fc.integer({ min: 1, max: 1_000_000_000 }).map(cents);
    const settings = fc
      .record({
        currency: fc.constantFrom("AUD" as const, "CNY" as const),
        smallBlind: positiveCents,
        extra: fc.integer({ min: 0, max: 1_000_000 }),
        chips: fc.integer({ min: 1, max: 1_000_000_000 }),
        amount: positiveCents,
      })
      .map(
        ({ currency, smallBlind, extra, chips, amount }): GameSettings => ({
          currency,
          smallBlind,
          bigBlind: cents(smallBlind + extra),
          chipRatio: { chips, amount },
        }),
      );
    fc.assert(
      fc.property(settings, (value) => {
        expect(parseGameSettings(toGameSettingsForm(value))).toEqual({ ok: true, settings: value });
      }),
    );
  });
});

describe("createGame", () => {
  it("新牌局是进行中状态", () => {
    expect(createGame(meta, DEFAULT_GAME_SETTINGS)).toEqual({
      ...meta,
      ...DEFAULT_GAME_SETTINGS,
      status: "open",
    });
  });
});

describe("updateGameSettings", () => {
  const game = createGame(meta, DEFAULT_GAME_SETTINGS);
  const next: GameSettings = {
    currency: "CNY",
    smallBlind: cents(500),
    bigBlind: cents(1000),
    chipRatio: { chips: 10, amount: cents(100) },
  };

  it("没有账本事件时可以改全部设置", () => {
    expect(updateGameSettings(game, next, { hasLedgerEvents: false })).toEqual({
      ...game,
      ...next,
    });
  });

  it("有账本事件后只改盲注，货币和筹码比例不变", () => {
    expect(updateGameSettings(game, next, { hasLedgerEvents: true })).toEqual({
      ...game,
      smallBlind: next.smallBlind,
      bigBlind: next.bigBlind,
    });
  });
});
