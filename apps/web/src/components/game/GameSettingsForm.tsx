import {
  type GameSettingsForm as FormValues,
  type GameSettings,
  type InsuranceRule,
  type InsuranceRuleIssues,
  parseGameSettings,
  parseInsuranceRule,
  toDecimalString,
  tryParseMoney,
} from "@holdem/core";
import { ChevronRight } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import {
  InsuranceSettings,
  initialInsuranceChoice,
} from "@/components/insurance/InsuranceSettings";
import { CURRENCY_INFO } from "@/lib/currency";
import {
  BlindsDialog,
  BuyInDialog,
  ChipRatioDialog,
  CurrencyDialog,
  previewBlindCash,
  previewHandChips,
} from "./GameSettingDialogs";

type SettingDialog = "currency" | "ratio" | "blinds" | "buyIn";

function SettingRow({
  label,
  detail,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  /** Small text under the value */
  detail?: string | null | undefined;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left disabled:opacity-60"
    >
      <span className="font-medium">{label}</span>
      <span className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 text-right">
          <span className="block font-medium">{children}</span>
          {detail && <span className="block text-sm text-muted">{detail}</span>}
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
      </span>
    </button>
  );
}

interface GameSettingsFormProps {
  initial: FormValues;
  submitLabel: string;
  /** Whether the currency and chip ratio are locked */
  ratioLocked?: boolean;
  /** Hides the buy-in setting for older games that already record chips */
  showBuyIn?: boolean;
  /** Insurance needs whole hands, so older games that record chips cannot use it */
  showInsurance?: boolean;
  /** This game's insurance rule. Missing means it is off. */
  initialInsurance?: InsuranceRule | undefined;
  /** Offered as "last time": this game's rule, or the latest game's */
  lastInsurance?: InsuranceRule | undefined;
  /** Once insurance has been sold in this game, it cannot be turned off */
  insuranceLocked?: boolean;
  saving: boolean;
  saveFailed: boolean;
  onSubmit: (settings: GameSettings) => void;
}

export function GameSettingsForm({
  initial,
  submitLabel,
  ratioLocked = false,
  showBuyIn = true,
  showInsurance = true,
  initialInsurance,
  lastInsurance,
  insuranceLocked = false,
  saving,
  saveFailed,
  onSubmit,
}: GameSettingsFormProps) {
  const [values, setValues] = useState(initial);
  const [dialog, setDialog] = useState<SettingDialog | null>(null);
  const [insurance, setInsurance] = useState(() =>
    initialInsuranceChoice(initialInsurance, lastInsurance),
  );
  const [ruleIssues, setRuleIssues] = useState<InsuranceRuleIssues>({});
  const currencyLabel = CURRENCY_INFO[values.currency].label;
  const ratioAmount = tryParseMoney(values.ratioAmount);
  const handChips = previewHandChips(values);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = parseGameSettings(values);
    const rule = showInsurance && insurance.enabled ? parseInsuranceRule(insurance.form) : null;
    setRuleIssues(rule && !rule.ok ? rule.issues : {});
    if (!result.ok || (rule && !rule.ok)) return;
    onSubmit(rule ? { ...result.settings, insurance: rule.rule } : result.settings);
  }

  const dialogProps = {
    values,
    onConfirm: (next: FormValues) => {
      setValues(next);
      setDialog(null);
    },
    onClose: () => setDialog(null),
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-6 pb-8">
        <div>
          <div className="divide-y divide-line rounded-xl border border-line bg-surface">
            <SettingRow label="货币" disabled={ratioLocked} onClick={() => setDialog("currency")}>
              {currencyLabel}
            </SettingRow>
            <SettingRow label="筹码" disabled={ratioLocked} onClick={() => setDialog("ratio")}>
              {values.ratioChips} <small className="font-normal text-muted">筹码</small> :{" "}
              {ratioAmount === null ? values.ratioAmount : toDecimalString(ratioAmount)}{" "}
              <small className="font-normal text-muted">{currencyLabel}</small>
            </SettingRow>
            <SettingRow
              label="盲注"
              detail={previewBlindCash(values)}
              onClick={() => setDialog("blinds")}
            >
              {values.smallBlindChips}/{values.bigBlindChips}
            </SettingRow>
            {showBuyIn && (
              <SettingRow
                label="Buy in"
                detail={
                  !ratioLocked && handChips !== null
                    ? `1 手 = ${handChips.toLocaleString("zh-CN")} 筹码`
                    : null
                }
                disabled={ratioLocked}
                onClick={() => setDialog("buyIn")}
              >
                {values.buyInBigBlinds}BB
              </SettingRow>
            )}
          </div>
          {ratioLocked && (
            <p className="mt-2 text-sm text-muted">
              已有账本记录，货币、筹码和 Buy in 不能再修改。
            </p>
          )}
        </div>

        {showInsurance && (
          <InsuranceSettings
            value={insurance}
            issues={ruleIssues}
            lastRule={lastInsurance}
            locked={insuranceLocked}
            onChange={setInsurance}
          />
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

      {/* Outside the form: a dialog's own form must not nest in it or submit it */}
      {dialog === "currency" && <CurrencyDialog {...dialogProps} />}
      {dialog === "ratio" && <ChipRatioDialog {...dialogProps} />}
      {dialog === "blinds" && <BlindsDialog {...dialogProps} />}
      {dialog === "buyIn" && <BuyInDialog {...dialogProps} />}
    </>
  );
}
