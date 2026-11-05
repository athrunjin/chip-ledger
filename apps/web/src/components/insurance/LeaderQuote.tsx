import type { InsuranceStreet, QuoteInput } from "@holdem/core";
import { type QuoteDecision, QuotePanel, type QuotePurchase } from "./QuotePanel";

export interface BoughtInsurance extends QuotePurchase {
  readonly playerId: string;
  readonly outs: number;
  readonly street: InsuranceStreet;
}

/** What has been decided for each offer, by a key for that exact offer. */
export interface Decisions {
  get: (key: string) => QuoteDecision | undefined;
  buy: (key: string, purchase: BoughtInsurance) => void | Promise<void>;
  decline: (key: string) => void;
  revise: (key: string) => void;
}

/** One buyer's quote, tied to its decision. */
export function LeaderQuote({
  id,
  decisionKey,
  input,
  playerId,
  saving,
  decisions,
}: {
  id: string;
  decisionKey: string;
  input: QuoteInput;
  playerId: string;
  saving: boolean | undefined;
  decisions: Decisions | undefined;
}) {
  return (
    <QuotePanel
      id={id}
      input={input}
      saving={saving}
      decision={decisions?.get(decisionKey)}
      onBuy={
        decisions &&
        ((purchase) =>
          decisions.buy(decisionKey, {
            ...purchase,
            playerId,
            outs: input.outs,
            street: input.street,
          }))
      }
      onDecline={decisions && (() => decisions.decline(decisionKey))}
      onRevise={decisions && (() => decisions.revise(decisionKey))}
    />
  );
}
