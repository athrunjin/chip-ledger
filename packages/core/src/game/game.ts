/**
 * Game settings: defaults, form parsing and validation, creating and updating.
 *
 * Form values are strings typed by the user, converted here to integers (cents, chips).
 */
import type { Currency, Game, OrganizerId, Timestamp } from "../domain";
import { cents, toDecimalString, tryParseMoney } from "../money";

export const CURRENCIES: readonly Currency[] = ["AUD", "CNY"];

type BaseSettings = Pick<Game, "currency" | "smallBlind" | "bigBlind" | "chipRatio">;

export type GameSettings = BaseSettings & { readonly buyInBigBlinds: number };

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  currency: "CNY",
  smallBlind: cents(100),
  bigBlind: cents(200),
  chipRatio: { chips: 1, amount: cents(100) },
  buyInBigBlinds: 100,
};

export interface GameSettingsForm {
  readonly currency: Currency;
  readonly smallBlind: string;
  readonly bigBlind: string;
  readonly ratioChips: string;
  readonly ratioAmount: string;
  readonly buyInBigBlinds: string;
}

export type GameSettingsField = Exclude<keyof GameSettingsForm, "currency">;

/** Issue codes. The UI decides the wording. */
export type GameSettingsIssue =
  | "invalid"
  | "not-positive"
  | "below-small-blind"
  | "not-whole-chips";

export type GameSettingsIssues = Partial<Record<GameSettingsField, GameSettingsIssue>>;

export type ParsedGameSettings =
  | { readonly ok: true; readonly settings: GameSettings }
  | { readonly ok: false; readonly issues: GameSettingsIssues };

/** Games from before this feature have no buy-in setting, so the form uses the default. */
export function toGameSettingsForm(
  settings: BaseSettings & Pick<Game, "buyInBigBlinds">,
): GameSettingsForm {
  return {
    currency: settings.currency,
    smallBlind: toDecimalString(settings.smallBlind),
    bigBlind: toDecimalString(settings.bigBlind),
    ratioChips: String(settings.chipRatio.chips),
    ratioAmount: toDecimalString(settings.chipRatio.amount),
    buyInBigBlinds: String(settings.buyInBigBlinds ?? DEFAULT_GAME_SETTINGS.buyInBigBlinds),
  };
}

/** Parses a chip count: a non-negative integer, thousands separators allowed. Returns null if it cannot be parsed. */
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

/** Chips per hand, or null if that is not a whole number of chips. */
export function handChipsFor({
  bigBlind,
  chipRatio,
  buyInBigBlinds,
}: Pick<GameSettings, "bigBlind" | "chipRatio" | "buyInBigBlinds">): number | null {
  const numerator = bigBlind * buyInBigBlinds * chipRatio.chips;
  if (!Number.isSafeInteger(numerator) || numerator % chipRatio.amount !== 0) return null;
  return numerator / chipRatio.amount;
}

/**
 * `buyInLocked`: once the ledger has events the hand size is fixed and the buy-in setting has no effect,
 * so changing blinds does not need the conversion checked again.
 */
export function parseGameSettings(
  form: GameSettingsForm,
  { buyInLocked = false }: { readonly buyInLocked?: boolean } = {},
): ParsedGameSettings {
  const smallBlind = tryParseMoney(form.smallBlind);
  const bigBlind = tryParseMoney(form.bigBlind);
  const ratioChips = parseChips(form.ratioChips);
  const ratioAmount = tryParseMoney(form.ratioAmount);
  const buyInBigBlinds = parseChips(form.buyInBigBlinds);

  const issues: GameSettingsIssues = {};
  const smallBlindIssue = positiveIssue(smallBlind);
  const bigBlindIssue = positiveIssue(bigBlind);
  const ratioChipsIssue = positiveIssue(ratioChips);
  const ratioAmountIssue = positiveIssue(ratioAmount);
  const buyInIssue = positiveIssue(buyInBigBlinds);
  if (smallBlindIssue) issues.smallBlind = smallBlindIssue;
  if (bigBlindIssue) issues.bigBlind = bigBlindIssue;
  if (ratioChipsIssue) issues.ratioChips = ratioChipsIssue;
  if (ratioAmountIssue) issues.ratioAmount = ratioAmountIssue;
  if (buyInIssue) issues.buyInBigBlinds = buyInIssue;

  if (
    smallBlind === null ||
    bigBlind === null ||
    ratioChips === null ||
    ratioAmount === null ||
    buyInBigBlinds === null ||
    Object.keys(issues).length > 0
  ) {
    return { ok: false, issues };
  }
  if (bigBlind < smallBlind) {
    return { ok: false, issues: { bigBlind: "below-small-blind" } };
  }
  const settings: GameSettings = {
    currency: form.currency,
    smallBlind,
    bigBlind,
    chipRatio: { chips: ratioChips, amount: ratioAmount },
    buyInBigBlinds,
  };
  if (!buyInLocked && handChipsFor(settings) === null) {
    return { ok: false, issues: { buyInBigBlinds: "not-whole-chips" } };
  }
  return { ok: true, settings };
}

export interface NewGameMeta {
  readonly id: string;
  readonly organizerId: OrganizerId;
  readonly createdAt: Timestamp;
}

/** Settings plus the converted hand size. Without a whole number the field is left out and the game records chips. */
function withHandChips(settings: GameSettings) {
  const handChips = handChipsFor(settings);
  return handChips === null ? settings : { ...settings, handChips };
}

export function createGame(meta: NewGameMeta, settings: GameSettings): Game {
  return { ...meta, ...withHandChips(settings), status: "open" };
}

/** Confirms settlement. Transfers are not saved because the ledger can always reproduce them. */
export function settleGame(game: Game, settledAt: Timestamp): Game {
  return { ...game, status: "settled", settledAt };
}

/** Reopens a settled game when a mistake turns up, so recording can continue. */
export function reopenGame(game: Game): Game {
  const { settledAt: _, ...rest } = game;
  return { ...rest, status: "open" };
}

/**
 * Updates game settings. Ledger events record chips and amounts come from the ratio,
 * so the currency and chip ratio cannot change once events exist, or existing amounts would change too.
 * Chips per hand are fixed too, or "3 hands" would mean different things within a game.
 */
export function updateGameSettings(
  game: Game,
  settings: GameSettings,
  { hasLedgerEvents }: { readonly hasLedgerEvents: boolean },
): Game {
  const { smallBlind, bigBlind } = settings;
  return hasLedgerEvents
    ? { ...game, smallBlind, bigBlind }
    : { ...game, ...withHandChips(settings) };
}
