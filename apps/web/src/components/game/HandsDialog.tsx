import { type ChipRatio, type Currency, chipsToCents, parseChips } from "@holdem/core";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { TextField } from "@/components/TextField";
import { formatGameMoney } from "@/lib/currency";
import { FormDialog } from "./FormDialog";

const stepClass = "size-12 shrink-0 rounded-xl border border-line text-xl font-semibold";

interface HandsDialogProps {
  title: string;
  initialHands: number;
  /** 打开时选中输入框，直接输入数字 */
  selectInput: boolean;
  handChips: number;
  ratio: ChipRatio;
  currency: Currency;
  saving: boolean;
  saveFailed: boolean;
  onSubmit: (hands: number) => void;
  onClose: () => void;
}

export function HandsDialog({
  title,
  initialHands,
  selectInput,
  handChips,
  ratio,
  currency,
  saving,
  saveFailed,
  onSubmit,
  onClose,
}: HandsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(String(initialHands));
  const [issue, setIssue] = useState<string>();
  const hands = parseChips(value);
  const valid = hands !== null && hands > 0;

  useEffect(() => {
    if (selectInput) inputRef.current?.select();
  }, [selectInput]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (valid) {
      onSubmit(hands);
    } else {
      setIssue("请输入大于 0 的整数手数");
    }
  }

  function step(by: number) {
    setIssue(undefined);
    setValue(String(Math.max(1, (hands ?? 0) + by)));
  }

  return (
    <FormDialog
      title={title}
      submitLabel="确定"
      saving={saving}
      saveFailed={saveFailed}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div>
        <div className="flex items-end gap-2">
          <button type="button" aria-label="减 1 手" onClick={() => step(-1)} className={stepClass}>
            −
          </button>
          <div className="min-w-0 flex-1">
            <TextField
              id="hands"
              label="手数"
              value={value}
              issue={undefined}
              suffix="手"
              inputMode="numeric"
              inputRef={inputRef}
              onChange={setValue}
            />
          </div>
          <button type="button" aria-label="加 1 手" onClick={() => step(1)} className={stepClass}>
            +
          </button>
        </div>
        {issue && <p className="mt-1 text-sm text-highlight">{issue}</p>}
        {valid && (
          <p className="mt-1 text-sm text-muted">
            {(hands * handChips).toLocaleString("zh-CN")} 筹码，
            {formatGameMoney(chipsToCents(hands * handChips, ratio), currency)}
          </p>
        )}
      </div>
    </FormDialog>
  );
}
