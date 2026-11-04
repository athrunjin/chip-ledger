import {
  CURRENCIES,
  chipsToCents,
  type GameSettingsForm as FormValues,
  type GameSettings,
  type GameSettingsField,
  type GameSettingsIssue,
  type GameSettingsIssues,
  parseChips,
  parseGameSettings,
  tryParseMoney,
} from "@holdem/core";
import { type FormEvent, useState } from "react";
import { TextField } from "@/components/TextField";
import { CURRENCY_INFO, formatGameMoney } from "@/lib/currency";

const ISSUE_TEXT: Record<GameSettingsIssue, string> = {
  invalid: "请输入有效的数字",
  "not-positive": "必须大于 0",
  "below-small-blind": "大盲不能小于小盲",
};

/** The blinds in cash for the current input, or null while the input is incomplete. */
function previewBlindCash({
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
  return `${cash(small)} / ${cash(big)}`;
}

interface GameSettingsFormProps {
  initial: FormValues;
  submitLabel: string;
  /** Whether the currency and chip ratio are locked */
  ratioLocked?: boolean;
  /** Hides the buy-in setting for older games that already record chips */
  showBuyIn?: boolean;
  saving: boolean;
  saveFailed: boolean;
  onSubmit: (settings: GameSettings) => void;
}

export function GameSettingsForm({
  initial,
  submitLabel,
  ratioLocked = false,
  showBuyIn = true,
  saving,
  saveFailed,
  onSubmit,
}: GameSettingsFormProps) {
  const [values, setValues] = useState(initial);
  const [issues, setIssues] = useState<GameSettingsIssues>({});
  const symbol = CURRENCY_INFO[values.currency].symbol;
  const blindCash = previewBlindCash(values);
  const big = parseChips(values.bigBlindChips);
  const multiple = parseChips(values.buyInBigBlinds);
  const handChips = big && multiple ? big * multiple : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = parseGameSettings(values);
    if (result.ok) {
      setIssues({});
      onSubmit(result.settings);
    } else {
      setIssues(result.issues);
    }
  }

  function field(name: GameSettingsField) {
    const issue = issues[name];
    return {
      id: name,
      value: values[name],
      issue: issue && ISSUE_TEXT[issue],
      onChange: (value: string) => setValues({ ...values, [name]: value }),
    };
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-6 pb-8">
      <fieldset disabled={ratioLocked} className="flex flex-col gap-6 disabled:opacity-60">
        <div>
          <span className="mb-2 block font-medium">货币</span>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.map((currency) => (
              <label key={currency} className="block">
                <input
                  type="radio"
                  name="currency"
                  value={currency}
                  checked={values.currency === currency}
                  onChange={() => setValues({ ...values, currency })}
                  className="peer sr-only"
                />
                <span className="grid min-h-12 cursor-pointer place-items-center rounded-xl border border-line bg-surface font-medium peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-highlight">
                  {CURRENCY_INFO[currency].label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block font-medium">筹码比例</span>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            <TextField {...field("ratioChips")} label="筹码数" suffix="筹码" inputMode="numeric" />
            <span className="mt-6 grid min-h-12 place-items-center text-muted">=</span>
            <TextField
              {...field("ratioAmount")}
              label="对应金额"
              prefix={symbol}
              inputMode="decimal"
            />
          </div>
        </div>
      </fieldset>

      {ratioLocked && (
        <p className="text-sm text-muted">已有账本记录，货币、筹码比例和买入不能再修改。</p>
      )}

      <div>
        <span className="mb-2 block font-medium">盲注（筹码）</span>
        <div className="grid grid-cols-2 items-start gap-2">
          <TextField {...field("smallBlindChips")} label="小盲" inputMode="numeric" />
          <TextField {...field("bigBlindChips")} label="大盲" inputMode="numeric" />
        </div>
        {blindCash && <p className="mt-1 text-sm text-muted">对应金额 {blindCash}</p>}
      </div>

      {showBuyIn && (
        <fieldset disabled={ratioLocked} className="disabled:opacity-60">
          <TextField
            {...field("buyInBigBlinds")}
            label="一个买入"
            suffix="个大盲"
            inputMode="numeric"
          />
          {!ratioLocked && handChips !== null && (
            <p className="mt-1 text-sm text-muted">
              1 手 = {handChips.toLocaleString("zh-CN")} 筹码
            </p>
          )}
        </fieldset>
      )}

      {saveFailed && (
        <p role="alert" className="text-sm text-highlight">
          保存失败，请重试。
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="min-h-12 rounded-xl bg-accent px-6 font-semibold text-accent-text disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
