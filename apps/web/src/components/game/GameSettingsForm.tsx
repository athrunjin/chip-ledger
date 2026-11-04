import {
  CURRENCIES,
  type GameSettingsForm as FormValues,
  type GameSettings,
  type GameSettingsField,
  type GameSettingsIssue,
  type GameSettingsIssues,
  handChipsFor,
  parseChips,
  parseGameSettings,
  tryParseMoney,
} from "@holdem/core";
import { type FormEvent, useState } from "react";
import { TextField } from "@/components/TextField";
import { CURRENCY_INFO } from "@/lib/currency";

const ISSUE_TEXT: Record<GameSettingsIssue, string> = {
  invalid: "请输入有效的数字",
  "not-positive": "必须大于 0",
  "below-small-blind": "大盲不能小于小盲",
  "not-whole-chips": "1 手换算后不是整数筹码，请调整",
};

/** 按当前输入算出 1 手的筹码数，输入还不完整时返回 null。 */
function previewHandChips({ bigBlind, ratioChips, ratioAmount, buyInBigBlinds }: FormValues) {
  const amount = tryParseMoney(bigBlind);
  const chips = parseChips(ratioChips);
  const ratioValue = tryParseMoney(ratioAmount);
  const multiple = parseChips(buyInBigBlinds);
  if (!amount || !chips || !ratioValue || !multiple) return null;
  return handChipsFor({
    bigBlind: amount,
    chipRatio: { chips, amount: ratioValue },
    buyInBigBlinds: multiple,
  });
}

interface GameSettingsFormProps {
  initial: FormValues;
  submitLabel: string;
  /** 货币和筹码比例是否已锁定 */
  ratioLocked?: boolean;
  /** 旧牌局已按筹码记录时隐藏买入设置 */
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
  const handChips = previewHandChips(values);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = parseGameSettings(values, { buyInLocked: ratioLocked });
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
        <span className="mb-2 block font-medium">盲注</span>
        <div className="grid grid-cols-2 items-start gap-2">
          <TextField {...field("smallBlind")} label="小盲" prefix={symbol} inputMode="decimal" />
          <TextField {...field("bigBlind")} label="大盲" prefix={symbol} inputMode="decimal" />
        </div>
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
