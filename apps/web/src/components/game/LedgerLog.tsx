import { gameRecord, type LedgerEvent, type RecordKind } from "@holdem-knight/core";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const RECORD_LABEL: Record<RecordKind, string> = {
  buy_in: "买入",
  rebuy: "补码",
  reduce: "减手",
  remove: "移出",
  cash_out: "离桌",
  return: "返回",
  stack_set: "改筹码",
  stack_undo: "撤销改筹码",
  insurance_buy: "买保险",
  insurance_hit: "保险命中",
  insurance_miss: "保险未中",
  insurance_undo: "撤销保险",
};

/** Long lists get a second collapse button at the bottom, so nobody has to scroll back up. */
const BOTTOM_CLOSE_FROM = 6;

const TIME = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface LedgerLogProps {
  events: readonly LedgerEvent[];
  nameOf: (playerId: string) => string;
}

/** Read-only game record, collapsed by default, oldest first, with a filter for one player. */
export function LedgerLog({ events, nameOf }: LedgerLogProps) {
  const [open, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const entries = gameRecord(events);
  const playerIds = [...new Set(entries.map((entry) => entry.playerId))];
  const shown = playerId ? entries.filter((entry) => entry.playerId === playerId) : entries;

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
          <label className="mt-2 block">
            <span className="sr-only">查看玩家</span>
            <select
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-line bg-surface px-3"
            >
              <option value="">全部玩家</option>
              {playerIds.map((id) => (
                <option key={id} value={id}>
                  {nameOf(id)}
                </option>
              ))}
            </select>
          </label>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface px-3">
            {shown.map((entry) => (
              <li key={entry.id} className="flex min-h-11 items-center gap-2 py-1">
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {TIME.format(entry.occurredAt)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {!playerId && `${nameOf(entry.playerId)} `}
                  {RECORD_LABEL[entry.kind]}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {entry.chips.toLocaleString("zh-CN")}
                </span>
              </li>
            ))}
          </ul>
          {shown.length >= BOTTOM_CLOSE_FROM && (
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
