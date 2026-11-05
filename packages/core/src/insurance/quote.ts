/** Insurance prices. Chips are whole, so premiums round up and payouts round down, in the insurer's favor. */
import type { InsuranceRule } from "../domain";
import type { InsuranceStreet } from "./analysis";

/** Premium needed for a payout of at least `coverChips`. */
export function premiumFor(coverChips: number, oddsHundredths: number): number {
  return Math.ceil((coverChips * 100) / oddsHundredths);
}

/**
 * Premium that leaves the buyer `netChips` on a hit, once the premium is paid. Without a refund each
 * chip of premium earns its odds less itself. At odds of 1 or below that earns nothing, so this
 * falls back to covering `netChips` with the payout alone.
 */
export function premiumForNet(
  netChips: number,
  oddsHundredths: number,
  refundPremium: boolean,
): number {
  const gain = refundPremium ? oddsHundredths : oddsHundredths - 100;
  return gain > 0 ? Math.ceil((netChips * 100) / gain) : premiumFor(netChips, oddsHundredths);
}

/** What `premiumChips` pays on a hit, including any refunded premium. */
export function payoutFor(
  premiumChips: number,
  oddsHundredths: number,
  refundPremium: boolean,
): number {
  const payout = Math.floor((premiumChips * oddsHundredths) / 100);
  return refundPremium ? payout + premiumChips : payout;
}

export interface QuoteInput {
  readonly rule: InsuranceRule;
  readonly street: InsuranceStreet;
  readonly potChips: number;
  /** Players who can win the pot. */
  readonly potPlayers: number;
  /** What the buyer wins if nothing changes. */
  readonly shareChips: number;
  /** What the buyer put in. */
  readonly stakeChips: number;
  readonly outs: number;
}

export interface QuoteOption {
  readonly premiumChips: number;
  readonly payoutChips: number;
  /** Result of the pot and the insurance together if the out comes: payout − premium. */
  readonly ifHitChips: number;
  /** Result if the out misses: the pot share − premium. */
  readonly ifMissChips: number;
  /** Whether the premium limit held this option below its target. */
  readonly capped: boolean;
}

export type QuoteBlock = "street-closed" | "too-many-players" | "no-outs" | "too-many-outs";

export type InsuranceQuote =
  | { readonly ok: false; readonly block: QuoteBlock }
  | {
      readonly ok: true;
      readonly oddsHundredths: number;
      /** Highest premium allowed: a hit may not leave more than the pot share, nor the premium pass the rule's limit. */
      readonly maxPremiumChips: number;
      /** A hit leaves the buyer what they put in. */
      readonly stake: QuoteOption;
      /** A hit leaves the buyer their whole share of the pot. */
      readonly fullPot: QuoteOption;
    };

/** Prices any premium for a quote, for the amount the organizer actually sells. */
export function priceOption(
  input: Pick<QuoteInput, "rule" | "shareChips">,
  oddsHundredths: number,
  premiumChips: number,
  capped = false,
): QuoteOption {
  const payoutChips = payoutFor(premiumChips, oddsHundredths, input.rule.refundPremium);
  return {
    premiumChips,
    payoutChips,
    ifHitChips: payoutChips - premiumChips,
    ifMissChips: input.shareChips - premiumChips,
    capped,
  };
}

function capChips({ rule, street, potChips }: QuoteInput): number {
  const percent = street === "turn" ? rule.turnCapPercent : rule.riverCapPercent;
  return percent === undefined ? Number.POSITIVE_INFINITY : Math.floor((potChips * percent) / 100);
}

export function quoteInsurance(input: QuoteInput): InsuranceQuote {
  const { rule, street, potPlayers, shareChips, stakeChips, outs } = input;
  if (street === "turn" && !rule.coverTurn) return { ok: false, block: "street-closed" };
  if (rule.maxPotPlayers !== undefined && potPlayers > rule.maxPotPlayers) {
    return { ok: false, block: "too-many-players" };
  }
  if (outs === 0) return { ok: false, block: "no-outs" };
  const oddsHundredths = rule.oddsHundredths[outs - 1];
  if (oddsHundredths === undefined) return { ok: false, block: "too-many-outs" };

  const premiumToLeave = (netChips: number) =>
    premiumForNet(netChips, oddsHundredths, rule.refundPremium);
  const maxPremiumChips = Math.min(premiumToLeave(shareChips), capChips(input));
  const option = (netChips: number) => {
    const target = premiumToLeave(netChips);
    const premium = Math.min(target, maxPremiumChips);
    return priceOption(input, oddsHundredths, premium, premium < target);
  };
  return {
    ok: true,
    oddsHundredths,
    maxPremiumChips,
    stake: option(stakeChips),
    fullPot: option(shareChips),
  };
}

/** Outs as sold under the rule: tie cards join them if the rule says so. */
export function soldOuts(
  rule: InsuranceRule,
  leader: { readonly outs: readonly number[]; readonly tieCards: readonly number[] },
): number {
  return leader.outs.length + (rule.tieOuts === "include" ? leader.tieCards.length : 0);
}
