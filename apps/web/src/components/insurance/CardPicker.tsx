import { type Card, makeCard, RANKS, SUITS } from "@holdem-knight/core";
import { useState } from "react";
import { formatCardText, isRedSuit, suitSymbol } from "@/lib/cards";
import { cn } from "@/lib/cn";
import { Modal } from "./Modal";

interface CardPickerProps {
  title: string;
  /** How many cards to choose. */
  count: number;
  /** Cards already on the table, which cannot be picked twice */
  usedCards: ReadonlySet<Card>;
  initial?: readonly Card[];
  onConfirm: (cards: readonly Card[]) => void;
  onCancel: () => void;
}

/** One column per suit, one row per rank, so every card keeps a 44px target on a phone. */
export function CardPicker({
  title,
  count,
  usedCards,
  initial = [],
  onConfirm,
  onCancel,
}: CardPickerProps) {
  const [chosen, setChosen] = useState<readonly Card[]>(initial);

  function toggle(card: Card) {
    if (chosen.includes(card)) setChosen(chosen.filter((c) => c !== card));
    else if (count === 1) setChosen([card]);
    else if (chosen.length < count) setChosen([...chosen, card]);
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="grid grid-cols-4 gap-1">
        {RANKS.toReversed().flatMap((rank) =>
          SUITS.map((suit) => {
            const card = makeCard(rank, suit);
            const selected = chosen.includes(card);
            return (
              <button
                key={card}
                type="button"
                disabled={usedCards.has(card)}
                aria-pressed={selected}
                aria-label={formatCardText(card)}
                onClick={() => toggle(card)}
                className={cn(
                  "min-h-11 rounded-lg border font-semibold tabular-nums disabled:opacity-25",
                  selected
                    ? "border-accent bg-accent text-accent-text"
                    : cn("border-line", isRedSuit(suit) && "text-loss"),
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
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-line font-medium"
        >
          取消
        </button>
        <button
          type="button"
          disabled={chosen.length !== count}
          onClick={() => onConfirm(chosen)}
          className="min-h-11 rounded-xl bg-accent font-semibold text-accent-text disabled:opacity-40"
        >
          确认（{chosen.length}/{count}）
        </button>
      </div>
    </Modal>
  );
}
