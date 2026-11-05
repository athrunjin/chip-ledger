import { parseChips } from "@holdem/core";
import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TextField } from "@/components/TextField";
import { Modal } from "./Modal";

interface DeadMoneyDialogProps {
  pools: readonly string[];
  onConfirm: (pools: readonly string[]) => void;
  onCancel: () => void;
}

const digitsOnly = (text: string) => text.replace(/\D/g, "");

/** Dead money, one pool per line. A new line is offered once the last one has a number. */
export function DeadMoneyDialog({ pools, onConfirm, onCancel }: DeadMoneyDialogProps) {
  const [draft, setDraft] = useState<readonly string[]>(pools.length > 0 ? pools : [""]);
  const lastRef = useRef<HTMLInputElement>(null);

  const chips = draft.map((text) => parseChips(text) ?? 0);
  const total = chips.reduce((sum, value) => sum + value, 0);
  const canAdd = (chips.at(-1) ?? 0) > 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new line takes the focus
  useEffect(() => {
    lastRef.current?.focus();
  }, [draft.length]);

  return (
    <Modal title="死钱" onClose={onCancel}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(draft.filter((text) => parseChips(text)));
        }}
      >
        {draft.map((text, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lines have no identity of their own
          <div key={i} className="mb-1 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                id={`dead-${i}`}
                label={`池 ${i + 1}`}
                value={text}
                issue={undefined}
                placeholder="0.00"
                inputMode="numeric"
                {...(i === draft.length - 1 ? { inputRef: lastRef } : {})}
                onChange={(value) =>
                  setDraft(draft.map((d, j) => (j === i ? digitsOnly(value) : d)))
                }
              />
            </div>
            {draft.length > 1 && (
              <button
                type="button"
                aria-label={`删除池 ${i + 1}`}
                onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                className="grid size-12 shrink-0 place-items-center rounded-xl border border-line"
              >
                <X className="size-5" aria-hidden />
              </button>
            )}
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            aria-label="添加一行"
            onClick={() => setDraft([...draft, ""])}
            className="mt-1 grid min-h-11 w-full place-items-center rounded-xl border border-dashed border-line text-highlight"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        )}
        <p className="mt-2 flex justify-between text-sm text-muted">
          <span>合计</span>
          <span className="font-semibold tabular-nums">{total.toLocaleString("zh-CN")}</span>
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-line font-medium"
          >
            取消
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-accent font-semibold text-accent-text"
          >
            确认
          </button>
        </div>
      </form>
    </Modal>
  );
}
