import {
  CURRENCIES,
  chipsToCents,
  type GameSettingsForm as FormValues,
  type GameSettingsField,
  type GameSettingsIssue,
  type GameSettingsIssues,
  parseChips,
  parseGameSettings,
  tryParseMoney,
} from "@holdem/core";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { TextField } from "@/components/TextField";
import { CURRENCY_INFO, formatGameMoney } from "@/lib/currency";
import { FormDialog } from "./FormDialog";

const ISSUE_TEXT: Record<GameSettingsIssue, string> = {
  invalid: "请输入有效的数字",
  "not-positive": "必须大于 0",
  "below-small-blind": "大盲不能小于小盲",
};

/** The blinds in cash for the current input, or null while the input is incomplete. */
export function previewBlindCash({
  currency,
  smallBlindChips,
  bigBlindChips,
  ratioChips,
  ratioAmount,
}: FormValues) {
  const small = parseChips(smallBlindChips);
  const big = parseChips(bigBlindChips);
  const chips = parseChips(ratioChips);
  const amount = tryParseMoney(ratioAmount);
  if (!small || !big || !chips || !amount) return null;
  const cash = (blind: number) => formatGameMoney(chipsToCents(blind, { chips, amount }), currency);
  return `${cash(small)}/${cash(big)}`;
}

/** Chips per hand for the current input, or null while the input is incomplete. */
export function previewHandChips({ bigBlindChips, buyInBigBlinds }: FormValues) {
  const big = parseChips(bigBlindChips);
  const multiple = parseChips(buyInBigBlinds);
  return big && multiple ? big * multiple : null;
}

interface SettingDialogProps {
  values: FormValues;
  onConfirm: (values: FormValues) => void;
  onClose: () => void;
}

/**
 * Edits a draft of the settings, which reach the form only once they pass validation.
 * The input given `inputRef` is selected on open so a number can be typed right away.
 */
function useSettingDraft({ values, onConfirm }: SettingDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(values);
  const [issues, setIssues] = useState<GameSettingsIssues>({});

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = parseGameSettings(draft);
    if (result.ok) {
      onConfirm(draft);
    } else {
      setIssues(result.issues);
    }
  }

  function field(name: GameSettingsField) {
    const issue = issues[name];
    return {
      id: name,
      value: draft[name],
      issue: issue && ISSUE_TEXT[issue],
      onChange: (value: string) => setDraft({ ...draft, [name]: value }),
    };
  }

  return { inputRef, draft, setDraft, handleSubmit, field };
}

export function CurrencyDialog(props: SettingDialogProps) {
  const { draft, setDraft, handleSubmit } = useSettingDraft(props);

  return (
    <FormDialog
      title="货币"
      submitLabel="确定"
      saving={false}
      saveFailed={false}
      onSubmit={handleSubmit}
      onClose={props.onClose}
    >
      <div className="flex flex-col gap-2">
        {CURRENCIES.map((currency) => (
          <label key={currency} className="block">
            <input
              type="radio"
              name="currency"
              value={currency}
              checked={draft.currency === currency}
              onChange={() => setDraft({ ...draft, currency })}
              className="peer sr-only"
            />
            <span className="grid min-h-12 cursor-pointer place-items-center rounded-xl border border-line bg-surface font-medium peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-highlight">
              {CURRENCY_INFO[currency].label}
            </span>
          </label>
        ))}
      </div>
    </FormDialog>
  );
}

export function ChipRatioDialog(props: SettingDialogProps) {
  const { inputRef, draft, handleSubmit, field } = useSettingDraft(props);

  return (
    <FormDialog
      title="筹码"
      submitLabel="确定"
      saving={false}
      saveFailed={false}
      onSubmit={handleSubmit}
      onClose={props.onClose}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <TextField
          {...field("ratioChips")}
          label="筹码数"
          suffix="筹码"
          inputMode="numeric"
          inputRef={inputRef}
        />
        <span className="mt-6 grid min-h-12 place-items-center text-muted">=</span>
        <TextField
          {...field("ratioAmount")}
          label="对应金额"
          prefix={CURRENCY_INFO[draft.currency].symbol}
          inputMode="decimal"
        />
      </div>
    </FormDialog>
  );
}

export function BlindsDialog(props: SettingDialogProps) {
  const { inputRef, draft, handleSubmit, field } = useSettingDraft(props);
  const blindCash = previewBlindCash(draft);

  return (
    <FormDialog
      title="盲注"
      submitLabel="确定"
      saving={false}
      saveFailed={false}
      onSubmit={handleSubmit}
      onClose={props.onClose}
    >
      <div>
        <div className="grid grid-cols-2 items-start gap-2">
          <TextField
            {...field("smallBlindChips")}
            label="小盲"
            inputMode="numeric"
            inputRef={inputRef}
          />
          <TextField {...field("bigBlindChips")} label="大盲" inputMode="numeric" />
        </div>
        {blindCash && <p className="mt-1 text-sm text-muted">对应金额 {blindCash}</p>}
      </div>
    </FormDialog>
  );
}

export function BuyInDialog(props: SettingDialogProps) {
  const { inputRef, draft, handleSubmit, field } = useSettingDraft(props);
  const handChips = previewHandChips(draft);

  return (
    <FormDialog
      title="Buy in"
      submitLabel="确定"
      saving={false}
      saveFailed={false}
      onSubmit={handleSubmit}
      onClose={props.onClose}
    >
      <div>
        <TextField
          {...field("buyInBigBlinds")}
          label="一个买入"
          suffix="BB"
          inputMode="numeric"
          inputRef={inputRef}
        />
        {handChips !== null && (
          <p className="mt-1 text-sm text-muted">1 手 = {handChips.toLocaleString("zh-CN")} 筹码</p>
        )}
      </div>
    </FormDialog>
  );
}
