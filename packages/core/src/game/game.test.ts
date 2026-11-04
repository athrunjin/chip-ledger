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
  it("converts form strings to integers", () => {
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

  it("reports every field that is unparseable or not positive", () => {
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

  it("requires the big blind to be at least the small blind", () => {
    expect(parseGameSettings({ ...form, smallBlind: "11", bigBlind: "10" })).toEqual({
      ok: false,
      issues: { bigBlind: "below-small-blind" },
    });
    expect(parseGameSettings({ ...form, smallBlind: "10", bigBlind: "10" }).ok).toBe(true);
  });

  it("treats chip counts beyond the safe integer range as invalid", () => {
    expect(parseGameSettings({ ...form, ratioChips: "99999999999999999" })).toEqual({
      ok: false,
      issues: { ratioChips: "invalid" },
    });
  });

  it("reports a hand that is not a whole number of chips", () => {
    const whole = { ...form, ratioChips: "1", ratioAmount: "5", bigBlind: "10.50" };
    expect(parseGameSettings({ ...whole, buyInBigBlinds: "3" })).toEqual({
      ok: false,
      issues: { buyInBigBlinds: "not-whole-chips" },
    });
    expect(parseGameSettings({ ...whole, buyInBigBlinds: "10" }).ok).toBe(true);
  });

  it("skips the conversion check once the buy-in is locked, so blinds can change", () => {
    const locked = { ...form, ratioChips: "1", ratioAmount: "5", buyInBigBlinds: "3" };
    expect(parseGameSettings(locked).ok).toBe(false);
    expect(parseGameSettings(locked, { buyInLocked: true }).ok).toBe(true);
  });

  it("keeps any valid settings unchanged through a form round trip", () => {
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
          // Chips are a whole multiple of the amount, so a hand is always a whole number of chips
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
  it("defaults to CNY, 1 chip = 1 yuan and 100 big blinds per buy-in", () => {
    expect(DEFAULT_GAME_SETTINGS).toMatchObject({
      currency: "CNY",
      chipRatio: { chips: 1, amount: cents(100) },
      buyInBigBlinds: 100,
    });
  });
});

describe("toGameSettingsForm", () => {
  it("uses the default for older games with no buy-in setting", () => {
    const { buyInBigBlinds: _, ...old } = DEFAULT_GAME_SETTINGS;
    expect(toGameSettingsForm(old).buyInBigBlinds).toBe("100");
  });
});

describe("handChipsFor", () => {
  it("multiplies the big blind and converts to chips at the ratio", () => {
    const ratio = { chips: 100, amount: cents(100) };
    expect(handChipsFor({ bigBlind: cents(200), chipRatio: ratio, buyInBigBlinds: 100 })).toBe(
      20_000,
    );
  });
});

describe("createGame", () => {
  it("starts open with chips per hand fixed", () => {
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

  it("records the time on settling and restores the game on reopening", () => {
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

  it("can change every setting when the ledger has no events", () => {
    expect(updateGameSettings(game, next, { hasLedgerEvents: false })).toEqual({
      ...game,
      ...next,
      handChips: 5000,
    });
  });

  it("changes only blinds once the ledger has events", () => {
    expect(updateGameSettings(game, next, { hasLedgerEvents: true })).toEqual({
      ...game,
      smallBlind: next.smallBlind,
      bigBlind: next.bigBlind,
    });
  });
});
