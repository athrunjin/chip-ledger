import { type ChipEvent, canReverse, type LedgerEvent } from "@holdem/core";
import { cn } from "@/lib/cn";

const EVENT_LABEL: Record<ChipEvent["type"], string> = {
  buy_in: "买入",
  rebuy: "补码",
  cash_out: "兑出",
};

const TIME = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" });

interface LedgerLogProps {
  events: readonly LedgerEvent[];
  nameOf: (playerId: string) => string;
  editable: boolean;
  onReverse: (eventId: string) => void;
}

/** 账本流水，最新的在前。撤销过的记录保留并划掉。 */
export function LedgerLog({ events, nameOf, editable, onReverse }: LedgerLogProps) {
  const entries = events.filter((e): e is ChipEvent => e.type !== "reversal").toReversed();

  return (
    <section className="mt-6 pb-8">
      <h2 className="text-lg font-semibold">流水</h2>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface px-3">
        {entries.map(({ id, type, playerId, chips, occurredAt }) => {
          const active = canReverse(events, id);
          return (
            <li key={id} className="flex min-h-12 items-center justify-between gap-3 py-1">
              <span className={cn("min-w-0 truncate", !active && "text-muted line-through")}>
                {TIME.format(occurredAt)} {nameOf(playerId)} {EVENT_LABEL[type]}{" "}
                {chips.toLocaleString("zh-CN")}
              </span>
              {active && editable && (
                <button
                  type="button"
                  aria-label={`撤销 ${nameOf(playerId)} ${EVENT_LABEL[type]} ${chips}`}
                  onClick={() => onReverse(id)}
                  className="min-h-11 shrink-0 px-2 text-sm text-highlight"
                >
                  撤销
                </button>
              )}
              {!active && <span className="shrink-0 text-sm text-muted">已撤销</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
