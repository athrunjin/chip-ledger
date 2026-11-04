import { type ChipRatio, type Currency, chipsToCents, parseChips } from "@holdem/core";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { TextField } from "@/components/TextField";
import { formatGameMoney } from "@/lib/currency";

interface ChipAmountDialogProps {
  title: string;
  submitLabel: string;
  initialChips: number | undefined;
  /** 兑出可以是 0（输光了），买入和补码必须大于 0 */
  allowZero: boolean;
  ratio: ChipRatio;
  currency: Currency;
  saving: boolean;
  saveFailed: boolean;
  onSubmit: (chips: number) => void;
  onClose: () => void;
}

export function ChipAmountDialog({
  title,
  submitLabel,
  initialChips,
  allowZero,
  ratio,
  currency,
  saving,
  saveFailed,
  onSubmit,
  onClose,
}: ChipAmountDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(initialChips === undefined ? "" : String(initialChips));
  const [issue, setIssue] = useState<string>();
  const chips = parseChips(value);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (chips === null) {
      setIssue("请输入整数筹码数");
    } else if (chips === 0 && !allowZero) {
      setIssue("必须大于 0");
    } else {
      onSubmit(chips);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-surface p-5 text-text backdrop:bg-black/60"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
        <div>
          <TextField
            id="chips"
            label="筹码数"
            value={value}
            issue={issue}
            suffix="筹码"
            inputMode="numeric"
            onChange={setValue}
          />
          {chips !== null && (
            <p className="mt-1 text-sm text-muted">
              等于 {formatGameMoney(chipsToCents(chips, ratio), currency)}
            </p>
          )}
        </div>
        {saveFailed && (
          <p role="alert" className="text-sm text-highlight">
            保存失败，请重试。
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="min-h-12 rounded-xl border border-line font-medium"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-12 rounded-xl bg-accent font-semibold text-accent-text disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
