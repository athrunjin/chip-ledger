/**
 * 牌局设置：默认值、表单解析和校验、新建与修改。
 *
 * 表单里的值都是用户输入的字符串，这里统一转成整数（分、筹码数）。
 */
import type { Currency, Game, OrganizerId, Timestamp } from "../domain";
import { cents, toDecimalString, tryParseMoney } from "../money";

export const CURRENCIES: readonly Currency[] = ["AUD", "CNY"];

export type GameSettings = Pick<Game, "currency" | "smallBlind" | "bigBlind" | "chipRatio">;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  currency: "AUD",
  smallBlind: cents(100),
  bigBlind: cents(200),
  chipRatio: { chips: 100, amount: cents(100) },
};

export interface GameSettingsForm {
  readonly currency: Currency;
  readonly smallBlind: string;
  readonly bigBlind: string;
  readonly ratioChips: string;
  readonly ratioAmount: string;
}

export type GameSettingsField = Exclude<keyof GameSettingsForm, "currency">;

/** 问题代码。文案由界面决定。 */
export type GameSettingsIssue = "invalid" | "not-positive" | "below-small-blind";

export type GameSettingsIssues = Partial<Record<GameSettingsField, GameSettingsIssue>>;

export type ParsedGameSettings =
  | { readonly ok: true; readonly settings: GameSettings }
  | { readonly ok: false; readonly issues: GameSettingsIssues };

export function toGameSettingsForm(settings: GameSettings): GameSettingsForm {
  return {
    currency: settings.currency,
    smallBlind: toDecimalString(settings.smallBlind),
    bigBlind: toDecimalString(settings.bigBlind),
    ratioChips: String(settings.chipRatio.chips),
    ratioAmount: toDecimalString(settings.chipRatio.amount),
  };
}

/** 解析筹码数：非负整数，可以带千分位。无法解析时返回 null。 */
export function parseChips(input: string): number | null {
  const normalized = input.trim().replace(/[,\s]/g, "");
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : null;
}

function positiveIssue(value: number | null): GameSettingsIssue | undefined {
  if (value === null) return "invalid";
  return value > 0 ? undefined : "not-positive";
}

export function parseGameSettings(form: GameSettingsForm): ParsedGameSettings {
  const smallBlind = tryParseMoney(form.smallBlind);
  const bigBlind = tryParseMoney(form.bigBlind);
  const ratioChips = parseChips(form.ratioChips);
  const ratioAmount = tryParseMoney(form.ratioAmount);

  const issues: GameSettingsIssues = {};
  const smallBlindIssue = positiveIssue(smallBlind);
  const bigBlindIssue = positiveIssue(bigBlind);
  const ratioChipsIssue = positiveIssue(ratioChips);
  const ratioAmountIssue = positiveIssue(ratioAmount);
  if (smallBlindIssue) issues.smallBlind = smallBlindIssue;
  if (bigBlindIssue) issues.bigBlind = bigBlindIssue;
  if (ratioChipsIssue) issues.ratioChips = ratioChipsIssue;
  if (ratioAmountIssue) issues.ratioAmount = ratioAmountIssue;

  if (
    smallBlind === null ||
    bigBlind === null ||
    ratioChips === null ||
    ratioAmount === null ||
    Object.keys(issues).length > 0
  ) {
    return { ok: false, issues };
  }
  if (bigBlind < smallBlind) {
    return { ok: false, issues: { bigBlind: "below-small-blind" } };
  }
  return {
    ok: true,
    settings: {
      currency: form.currency,
      smallBlind,
      bigBlind,
      chipRatio: { chips: ratioChips, amount: ratioAmount },
    },
  };
}

export interface NewGameMeta {
  readonly id: string;
  readonly organizerId: OrganizerId;
  readonly createdAt: Timestamp;
}

export function createGame(meta: NewGameMeta, settings: GameSettings): Game {
  return { ...meta, ...settings, status: "open" };
}

/** 确认结算。转账方案不保存，随时可以从账本重新算出来。 */
export function settleGame(game: Game, settledAt: Timestamp): Game {
  return { ...game, status: "settled", settledAt };
}

/** 结算后发现记错了，重新打开继续记账。 */
export function reopenGame(game: Game): Game {
  const { settledAt: _, ...rest } = game;
  return { ...rest, status: "open" };
}

/**
 * 修改牌局设置。账本事件记录的是筹码数，金额由比例推导，
 * 所以有事件之后不能再改货币和筹码比例，否则已有记录的金额会跟着变。
 */
export function updateGameSettings(
  game: Game,
  settings: GameSettings,
  { hasLedgerEvents }: { readonly hasLedgerEvents: boolean },
): Game {
  const { smallBlind, bigBlind } = settings;
  return hasLedgerEvents ? { ...game, smallBlind, bigBlind } : { ...game, ...settings };
}
