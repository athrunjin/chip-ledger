import {
  type InsuranceHand,
  type InsuranceRule,
  type InsuranceStreet,
  parseChips,
} from "@holdem/core";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { cn } from "@/lib/cn";
import { type HandStore, InsuranceHandFlow } from "./InsuranceHandFlow";
import { type BoughtInsurance, type Decisions, LeaderQuote } from "./LeaderQuote";
import type { QuoteDecision } from "./QuotePanel";

export type { BoughtInsurance } from "./LeaderQuote";

export interface InsuranceSeat {
  readonly id: string;
  readonly name: string;
}

export interface InsuranceRecorder {
  /** Resolves to the purchase's ID, or undefined if it was not saved. */
  onBuy: (purchase: BoughtInsurance) => Promise<string | undefined>;
  /** Takes a purchase back for changing. False if the organizer kept it. */
  onRevise: (purchaseId: string) => boolean;
  /** Purchases still in effect. */
  boughtIds: ReadonlySet<string>;
}

interface InsuranceCalculatorProps {
  rule: InsuranceRule;
  seats: readonly InsuranceSeat[];
  saving?: boolean | undefined;
  /** Missing for the standalone calculator, which records nothing. */
  recorder?: InsuranceRecorder;
  handStore?: HandStore;
  /** The hand in progress, to carry on from. */
  openHand?: InsuranceHand | undefined;
  createHand: () => InsuranceHand;
}

type ByOutsProps = Pick<InsuranceCalculatorProps, "rule" | "seats" | "saving"> & {
  decisions: Decisions | undefined;
};

const digitsOnly = (text: string) => text.replace(/\D/g, "");

const toggleClass = (active: boolean) =>
  cn(
    "min-h-11 rounded-xl border px-3 font-medium",
    active ? "border-accent bg-accent text-accent-text" : "border-line bg-surface",
  );

function ByOuts({ rule, seats, saving, decisions }: ByOutsProps) {
  const [pot, setPot] = useState("");
  const [stake, setStake] = useState("");
  const [outs, setOuts] = useState("");
  const [street, setStreet] = useState<InsuranceStreet>("river");
  const [buyer, setBuyer] = useState(seats[0]?.id ?? "");

  const potChips = parseChips(pot);
  const stakeChips = parseChips(stake);
  const outCount = parseChips(outs);
  const ready = potChips && stakeChips && outCount !== null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {decisions && (
        <label className="block">
          <span className="mb-1 block text-sm text-muted">投保玩家</span>
          <select
            value={buyer}
            onChange={(event) => setBuyer(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-line bg-surface px-3"
          >
            {seats.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={street === "turn"}
          onClick={() => setStreet("turn")}
          className={toggleClass(street === "turn")}
        >
          保转牌
        </button>
        <button
          type="button"
          aria-pressed={street === "river"}
          onClick={() => setStreet("river")}
          className={toggleClass(street === "river")}
        >
          保河牌
        </button>
      </div>
      <div className="grid grid-cols-3 items-start gap-2">
        <TextField
          id="manual-pot"
          label="底池"
          value={pot}
          issue={undefined}
          inputMode="numeric"
          onChange={(value) => setPot(digitsOnly(value))}
        />
        <TextField
          id="manual-stake"
          label="自己投入"
          value={stake}
          issue={undefined}
          inputMode="numeric"
          onChange={(value) => setStake(digitsOnly(value))}
        />
        <TextField
          id="manual-outs"
          label="outs"
          value={outs}
          issue={undefined}
          inputMode="numeric"
          onChange={(value) => setOuts(digitsOnly(value))}
        />
      </div>
      {ready ? (
        <section className="rounded-xl border border-line bg-surface p-3">
          <LeaderQuote
            id="manual"
            decisionKey={["manual", buyer, street, potChips, stakeChips, outCount].join("|")}
            input={{
              rule,
              street,
              potChips,
              potPlayers: 2,
              shareChips: potChips,
              stakeChips,
              outs: outCount,
            }}
            playerId={buyer}
            saving={saving}
            decisions={decisions}
          />
        </section>
      ) : (
        <p className="text-sm text-muted">填好底池、投入和 outs 后开始计算。</p>
      )}
    </div>
  );
}

function useDecisions(recorder: InsuranceRecorder | undefined): Decisions | undefined {
  const [decided, setDecided] = useState<ReadonlyMap<string, QuoteDecision>>(new Map());
  if (!recorder) return undefined;

  const write = (key: string, decision: QuoteDecision | undefined) =>
    setDecided((current) => {
      const next = new Map(current);
      if (decision) next.set(key, decision);
      else next.delete(key);
      return next;
    });

  return {
    get(key) {
      const decision = decided.get(key);
      // A purchase undone from the records below is open again
      return decision?.kind === "bought" && !recorder.boughtIds.has(decision.purchaseId)
        ? undefined
        : decision;
    },
    async buy(key, purchase) {
      const { premiumChips, payoutChips } = purchase.option;
      const purchaseId = await recorder.onBuy(purchase);
      if (purchaseId) write(key, { kind: "bought", purchaseId, premiumChips, payoutChips });
    },
    decline: (key) => write(key, { kind: "declined" }),
    revise(key) {
      const decision = decided.get(key);
      if (decision?.kind === "bought" && !recorder.onRevise(decision.purchaseId)) return;
      write(key, undefined);
    },
  };
}

/** Works out insurance from the cards, or from an outs count for a quick price. */
export function InsuranceCalculator({
  recorder,
  handStore,
  openHand,
  createHand,
  rule,
  seats,
  saving,
}: InsuranceCalculatorProps) {
  const [mode, setMode] = useState<"cards" | "outs">("cards");
  const decisions = useDecisions(recorder);
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={mode === "cards"}
          onClick={() => setMode("cards")}
          className={toggleClass(mode === "cards")}
        >
          选牌计算
        </button>
        <button
          type="button"
          aria-pressed={mode === "outs"}
          onClick={() => setMode("outs")}
          className={toggleClass(mode === "outs")}
        >
          填 outs
        </button>
      </div>
      {/* Stays mounted, so looking at the other mode keeps the hand */}
      <div hidden={mode !== "cards"}>
        <InsuranceHandFlow
          rule={rule}
          seats={seats}
          open={openHand}
          createHand={createHand}
          store={handStore}
        />
      </div>
      {mode === "outs" && (
        <ByOuts rule={rule} seats={seats} saving={saving} decisions={decisions} />
      )}
    </>
  );
}
