import { useEffect, useRef } from "react";
import type { InsuranceSeat } from "./InsuranceCalculator";

interface SeatPickerProps {
  seats: readonly InsuranceSeat[];
  /** Seats already all-in in another row. */
  takenSeats: readonly string[];
  onPick: (seat: InsuranceSeat) => void;
  onClose: () => void;
}

/** Names stay out of the page until someone goes looking for one. */
export function SeatPicker({ seats, takenSeats, onPick, onClose }: SeatPickerProps) {
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
      <h2 className="mb-2 font-semibold">选择全下玩家</h2>
      {seats.length === 0 && <p className="mb-2 text-sm text-muted">牌桌上还没有玩家。</p>}
      <div className="grid grid-cols-2 gap-2">
        {seats.map((seat) => (
          <button
            key={seat.id}
            type="button"
            disabled={takenSeats.includes(seat.id)}
            onClick={() => onPick(seat)}
            className="min-h-11 truncate rounded-xl border border-line px-3 font-medium disabled:opacity-40"
          >
            {seat.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => ref.current?.close()}
        className="mt-2 min-h-11 w-full rounded-xl border border-line font-medium"
      >
        关闭
      </button>
    </dialog>
  );
}
