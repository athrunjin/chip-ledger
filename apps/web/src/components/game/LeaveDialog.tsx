import { type ChipRatio, type Currency, chipsToCents, parseChips } from "@holdem/core";
import { type FormEvent, useState } from "react";
import { TextField } from "@/components/TextField";
import { formatSignedChips, netColor } from "@/lib/chips";
import { formatGameMoney } from "@/lib/currency";
import { FormDialog } from "./FormDialog";
import { HandsStepper } from "./HandsStepper";

interface LeaveDialogProps {
  name: string;
  /** Chips per hand. Missing on older games, which have no hand count to confirm. */
  handChips: number | undefined;
  boughtChips: number;
  cashedOutChips: number;
  stackChips: number;
  ratio: ChipRatio;
  currency: Currency;
  saving: boolean;
  saveFailed: boolean;
  onSubmit: (chips: number, hands: number | undefined) => void;
  onClose: () => void;
}

/** Confirms a player's final hands and chips before they leave the table. */
export function LeaveDialog({
  name,
  handChips,
  boughtChips,
  cashedOutChips,
  stackChips,
  ratio,
  currency,
  saving,
  saveFailed,
  onSubmit,
  onClose,
}: LeaveDialogProps) {
  const initialHands = handChips === undefined ? undefined : boughtChips / handChips;
  const [handsValue, setHandsValue] = useState(String(initialHands ?? ""));
  const [countedHands, setCountedHands] = useState(initialHands ?? 0);
  const [chipsValue, setChipsValue] = useState(String(stackChips));
  const [issue, setIssue] = useState<string>();
  const chips = parseChips(chipsValue);

  /** Chips follow the hand count, as they do on the player row. */
  function changeHands(next: string) {
    setHandsValue(next);
    setIssue(undefined);
    const hands = parseChips(next);
    if (handChips === undefined || !hands) return;
    if (chips !== null) {
      setChipsValue(String(Math.max(0, chips + (hands - countedHands) * handChips)));
    }
    setCountedHands(hands);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (chips === null) {
      setIssue("请输入整数筹码数");
    } else if (handChips !== undefined && !parseChips(handsValue)) {
      setIssue("请输入大于 0 的整数手数");
    } else {
      onSubmit(chips, handChips === undefined ? undefined : countedHands);
    }
  }

  const finalBought =
    handChips === undefined
      ? boughtChips
      : boughtChips + (countedHands - (initialHands ?? 0)) * handChips;
  const net = chips === null ? null : chips + cashedOutChips - finalBought;

  return (
    <FormDialog
      title={`离桌 · ${name}`}
      submitLabel="确认离桌"
      saving={saving}
      saveFailed={saveFailed}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {handChips !== undefined && <HandsStepper value={handsValue} onChange={changeHands} />}
      <div>
        <TextField
          id="leave-chips"
          label="筹码数"
          value={chipsValue}
          issue={issue}
          suffix="筹码"
          inputMode="numeric"
          onChange={(next) => {
            setIssue(undefined);
            setChipsValue(next);
          }}
        />
        {chips !== null && net !== null && (
          <p className="mt-1 text-sm text-muted">
            {formatGameMoney(chipsToCents(chips, ratio), currency)}，
            <span className={netColor(net)}>{net === 0 ? "不输不赢" : formatSignedChips(net)}</span>
          </p>
        )}
      </div>
    </FormDialog>
  );
}
