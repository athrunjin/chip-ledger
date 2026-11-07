import { parseChips } from "@holdem-knight/core";
import { useEffect, useRef, useState } from "react";
import { TextField } from "@/components/TextField";
import { cn } from "@/lib/cn";
import { Modal } from "./Modal";

interface PlayerChipsDialogProps {
  name: string;
  chips: number;
  cover: boolean;
  /** Another player already has the cover. */
  coverTaken: boolean;
  onConfirm: (entry: { chips: number; cover: boolean }) => void;
  onCancel: () => void;
}

/** What a player put in, or the cover: the deepest of these players, who matches the next deepest. */
export function PlayerChipsDialog({
  name,
  chips,
  cover,
  coverTaken,
  onConfirm,
  onCancel,
}: PlayerChipsDialogProps) {
  const [text, setText] = useState(chips.toString());
  const [covering, setCovering] = useState(cover);
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected, so the first digit replaces the value
  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const typed = parseChips(text) ?? 0;
  const valid = covering || typed > 0;

  return (
    <Modal title={`${name} 的筹码`} onClose={onCancel}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onConfirm({ chips: covering ? 0 : typed, cover: covering });
        }}
      >
        <TextField
          id="hand-player-chips"
          label="投入筹码"
          value={covering ? "" : text}
          issue={undefined}
          {...(covering ? { placeholder: "Cover" } : {})}
          suffix="筹码"
          inputMode="numeric"
          inputRef={inputRef}
          onFocus={() => setCovering(false)}
          onChange={(value) => setText(value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
        />
        <button
          type="button"
          aria-pressed={covering}
          disabled={coverTaken}
          onClick={() => setCovering(!covering)}
          className={cn(
            "mt-2 min-h-11 w-full rounded-xl border font-medium disabled:opacity-40",
            covering ? "border-accent bg-accent text-accent-text" : "border-line",
          )}
        >
          {coverTaken ? "Cover（已有玩家）" : "Cover（后手最多）"}
        </button>
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
            disabled={!valid}
            className="min-h-11 rounded-xl bg-accent font-semibold text-accent-text disabled:opacity-40"
          >
            确认
          </button>
        </div>
      </form>
    </Modal>
  );
}
