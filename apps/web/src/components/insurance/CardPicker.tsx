import { type Card, makeCard, RANKS, SUITS } from "@holdem/core";
import { useEffect, useRef } from "react";
import { formatCardText, isRedSuit, suitSymbol } from "@/lib/cards";
import { cn } from "@/lib/cn";

export interface CardPickerTab {
  id: string;
  label: string;
  active: boolean;
  onSelect: () => void;
}

interface CardPickerProps {
  title: string;
  /** Jumps straight to another hand or the board. */
  tabs: readonly CardPickerTab[];
  /** Cards already on the table, which cannot be picked twice */
  usedCards: ReadonlySet<Card>;
  canClear: boolean;
  onPick: (card: Card) => void;
  onClear: () => void;
  onClose: () => void;
}

/** One column per suit, one row per rank, so every card keeps a 44px target on a phone. */
export function CardPicker({
  title,
  tabs,
  usedCards,
  canClear,
  onPick,
  onClear,
  onClose,
}: CardPickerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-sm rounded-2xl border border-line bg-surface p-3 text-text backdrop:bg-black/60"
    >
      <div className="mb-2 flex gap-1 overflow-x-auto">
        {tabs.map(({ id, label, active, onSelect }) => (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={onSelect}
            className={cn(
              "min-h-11 max-w-32 shrink-0 truncate rounded-lg border px-3 font-medium",
              active ? "border-accent bg-accent text-accent-text" : "border-line",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <h2 className="mb-2 font-semibold">{title}</h2>
      <div className="grid grid-cols-4 gap-1">
        {RANKS.toReversed().flatMap((rank) =>
          SUITS.map((suit) => {
            const card = makeCard(rank, suit);
            return (
              <button
                key={card}
                type="button"
                disabled={usedCards.has(card)}
                aria-label={formatCardText(card)}
                onClick={() => onPick(card)}
                className={cn(
                  "min-h-11 rounded-lg border border-line font-semibold tabular-nums disabled:opacity-25",
                  isRedSuit(suit) && "text-loss",
                )}
              >
                {rank === "T" ? "10" : rank}
                {suitSymbol(suit)}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canClear}
          onClick={onClear}
          className="min-h-11 rounded-xl border border-line font-medium disabled:opacity-40"
        >
          清除这张
        </button>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="min-h-11 rounded-xl border border-line font-medium"
        >
          关闭
        </button>
      </div>
    </dialog>
  );
}
