import { parseChips, priceOption, type QuoteInput } from "@holdem/core";
import { useEffect, useRef, useState } from "react";
import { TextField } from "@/components/TextField";
import { Modal } from "./Modal";

interface PremiumDialogProps {
  input: QuoteInput;
  oddsHundredths: number;
  maxPremiumChips: number;
  initialChips: number;
  onConfirm: (premiumChips: number) => void;
  onCancel: () => void;
}

const chipText = (chips: number) => chips.toLocaleString("zh-CN");

/** A premium of the organizer's own, priced as it is typed. */
export function PremiumDialog({
  input,
  oddsHundredths,
  maxPremiumChips,
  initialChips,
  onConfirm,
  onCancel,
}: PremiumDialogProps) {
  const [text, setText] = useState(initialChips.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected, so the first digit replaces the value
  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const typed = parseChips(text) ?? 0;
  const tooHigh = typed > maxPremiumChips;
  const option = typed > 0 && !tooHigh ? priceOption(input, oddsHundredths, typed) : undefined;

  return (
    <Modal title="自定义保费" onClose={onCancel}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (option) onConfirm(typed);
        }}
      >
        <TextField
          id={`premium-${input.street}`}
          label={`保费（最多 ${chipText(maxPremiumChips)}）`}
          value={text}
          issue={tooHigh ? "保费不能超过上限" : undefined}
          suffix="筹码"
          inputMode="numeric"
          inputRef={inputRef}
          onChange={(value) => setText(value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
        />
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          {[
            ["赔付", option?.payoutChips],
            ["中了到手", option?.ifHitChips],
            ["没中到手", option?.ifMissChips],
          ].map(([label, chips]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-semibold tabular-nums">
                {typeof chips === "number" ? chipText(chips) : "—"}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-line font-medium"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!option}
            className="min-h-11 rounded-xl bg-accent font-semibold text-accent-text disabled:opacity-40"
          >
            确定
          </button>
        </div>
      </form>
    </Modal>
  );
}
