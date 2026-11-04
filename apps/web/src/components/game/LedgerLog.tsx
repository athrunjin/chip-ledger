import { canReverse, type LedgerEvent } from "@holdem/core";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

type RecordEvent = Exclude<LedgerEvent, { type: "reversal" }>;

const EVENT_LABEL: Record<RecordEvent["type"], string> = {
  buy_in: "买入",
  rebuy: "补码",
  cash_out: "离桌",
  stack_set: "改筹码",
};

/** Long lists get a second collapse button at the bottom, so nobody has to scroll back up. */
const BOTTOM_CLOSE_FROM = 6;

const TIME = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" });

interface LedgerLogProps {
  events: readonly LedgerEvent[];
  nameOf: (playerId: string) => string;
  editable: boolean;
  onReverse: (eventId: string) => void;
}

/** Game record, collapsed by default and newest first. Undone records stay visible and are struck through. */
export function LedgerLog({ events, nameOf, editable, onReverse }: LedgerLogProps) {
  const [open, setOpen] = useState(false);
  const entries = events.filter((e): e is RecordEvent => e.type !== "reversal").toReversed();

  return (
    <section className="mt-4 pb-8">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-line bg-surface px-3 font-medium"
        >
          <span>牌局记录（{entries.length}）</span>
          <ChevronDown
            className={cn("size-5 text-muted transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </h2>
      {open && (
        <>
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
          {entries.length >= BOTTOM_CLOSE_FROM && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 flex min-h-11 w-full items-center justify-center text-sm text-highlight"
            >
              收起牌局记录
            </button>
          )}
        </>
      )}
    </section>
  );
}
