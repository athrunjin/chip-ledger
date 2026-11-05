import {
  formatOdds,
  type InsuranceQuote,
  parseChips,
  priceOption,
  type QuoteBlock,
  type QuoteInput,
  type QuoteOption,
  quoteInsurance,
} from "@holdem/core";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { cn } from "@/lib/cn";

const BLOCK_TEXT: Record<QuoteBlock, string> = {
  "street-closed": "当前规则不卖转牌保险",
  "too-many-players": "这个底池人数超过规则上限，不能投保",
  "no-outs": "没有反超牌，不需要保险",
  "too-many-outs": "outs 超出赔率表，不能投保",
};

const chipText = (chips: number) => chips.toLocaleString("zh-CN");

export interface QuotePurchase {
  readonly option: QuoteOption;
  readonly oddsHundredths: number;
}

interface QuotePanelProps {
  id: string;
  input: QuoteInput;
  saving?: boolean | undefined;
  /** Missing for the standalone calculator, which records nothing. */
  onBuy?: ((purchase: QuotePurchase) => void) | undefined;
}

function OptionRow({
  label,
  option,
  selected,
  onSelect,
}: {
  label: string;
  option: QuoteOption;
  selected: boolean;
  onSelect?: (() => void) | undefined;
}) {
  const cells = (
    <>
      <span className="text-left font-medium">
        {label}
        {option.capped && <span className="block text-xs text-highlight">已到上限</span>}
      </span>
      <span className="font-semibold text-highlight">{chipText(option.premiumChips)}</span>
      <span>{chipText(option.payoutChips)}</span>
      <span>{chipText(option.ifHitChips)}</span>
      <span>{chipText(option.ifMissChips)}</span>
    </>
  );
  const rowClass = "grid min-h-11 w-full grid-cols-[1fr_repeat(4,3.6rem)] items-center gap-1 px-2";
  if (!onSelect) return <div className={cn(rowClass, "text-right tabular-nums")}>{cells}</div>;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        rowClass,
        "rounded-lg border text-right tabular-nums",
        selected ? "border-accent" : "border-transparent",
      )}
    >
      {cells}
    </button>
  );
}

function Quote({
  id,
  input,
  quote,
  saving,
  onBuy,
}: QuotePanelProps & { quote: Extract<InsuranceQuote, { ok: true }> }) {
  const { oddsHundredths, maxPremiumChips, stake, fullPot } = quote;
  const [choice, setChoice] = useState<"stake" | "full" | "custom">("full");
  const [custom, setCustom] = useState("");

  const typed = parseChips(custom);
  const customValid = typed !== null && typed > 0 && typed <= maxPremiumChips;
  const customOption = customValid ? priceOption(input, oddsHundredths, typed) : undefined;
  const chosen = choice === "stake" ? stake : choice === "full" ? fullPot : customOption;

  return (
    <div className="mt-2">
      <div className="grid grid-cols-[1fr_repeat(4,3.6rem)] gap-1 px-2 text-right text-xs text-muted">
        <span className="text-left">赔 {formatOdds(oddsHundredths)} 倍</span>
        <span>保费</span>
        <span>赔付</span>
        <span>中了到手</span>
        <span>没中到手</span>
      </div>
      <OptionRow
        label="保回投入"
        option={stake}
        selected={choice === "stake"}
        onSelect={onBuy && (() => setChoice("stake"))}
      />
      <OptionRow
        label="保回整池"
        option={fullPot}
        selected={choice === "full"}
        onSelect={onBuy && (() => setChoice("full"))}
      />
      {customOption && (
        <OptionRow label="自定义" option={customOption} selected={choice === "custom"} />
      )}
      <div className="mt-2">
        <TextField
          id={`${id}-premium`}
          label={`自定义保费（最多 ${chipText(maxPremiumChips)}）`}
          value={custom}
          issue={custom !== "" && !customValid ? "保费要大于 0 且不超过上限" : undefined}
          suffix="筹码"
          inputMode="numeric"
          onFocus={() => setChoice("custom")}
          onChange={(value) => {
            setCustom(value);
            setChoice("custom");
          }}
        />
      </div>
      {onBuy && (
        <button
          type="button"
          disabled={saving || !chosen}
          onClick={() => chosen && onBuy({ option: chosen, oddsHundredths })}
          className="mt-2 min-h-12 w-full rounded-xl bg-accent font-semibold text-accent-text disabled:opacity-60"
        >
          {chosen ? `记录投保 · 保费 ${chipText(chosen.premiumChips)}` : "记录投保"}
        </button>
      )}
    </div>
  );
}

/** Prices a pot for one buyer: both standard covers, any custom premium, and the result either way. */
export function QuotePanel({ id, input, saving, onBuy }: QuotePanelProps) {
  const quote = quoteInsurance(input);
  if (!quote.ok) return <p className="mt-2 text-sm text-muted">{BLOCK_TEXT[quote.block]}</p>;
  // Remount when the price changes, so a typed premium never carries over to different odds
  const key = `${quote.oddsHundredths}-${quote.maxPremiumChips}`;
  return <Quote key={key} id={id} input={input} quote={quote} saving={saving} onBuy={onBuy} />;
}
