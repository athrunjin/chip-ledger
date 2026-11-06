import {
  BUILT_IN_RULES,
  type InsuranceRule,
  type InsuranceRuleForm,
  type InsuranceRuleIssues,
  parseInsuranceRule,
  RULE_30,
  toInsuranceRuleForm,
} from "@holdem/core";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { Toggle } from "@/components/Toggle";
import {
  newSavedRule,
  useInsuranceRules,
  useRemoveInsuranceRule,
  useSaveInsuranceRule,
} from "@/data/insurance";
import { cn } from "@/lib/cn";

const LAST_RULE = "last";
const CUSTOM_RULE = "custom";

/** The default odds for a row added past the end of the table: the last row's. */
const lastOdds = (odds: readonly string[]) => odds.at(-1) ?? "1";

const pillClass = (active: boolean) =>
  cn(
    "min-h-11 rounded-full border px-4 font-medium",
    active ? "border-accent bg-accent text-accent-text" : "border-line bg-surface",
  );

export interface InsuranceChoice {
  readonly enabled: boolean;
  readonly source: string;
  readonly form: InsuranceRuleForm;
}

export function initialInsuranceChoice(
  current: InsuranceRule | undefined,
  last: InsuranceRule | undefined,
): InsuranceChoice {
  const rule = current ?? last ?? RULE_30;
  return {
    enabled: current !== undefined,
    source: current || last ? LAST_RULE : (BUILT_IN_RULES[0]?.id ?? CUSTOM_RULE),
    form: toInsuranceRuleForm(rule),
  };
}

interface InsuranceSettingsProps {
  value: InsuranceChoice;
  issues: InsuranceRuleIssues;
  /** The rule to offer as "last time", from this game or the latest one that had insurance */
  lastRule: InsuranceRule | undefined;
  /** What to call that rule in the list */
  lastRuleLabel: string;
  /** Once insurance has been sold in this game, it cannot be turned off */
  locked: boolean;
  onChange: (value: InsuranceChoice) => void;
}

/** Turns insurance on for a game, picks a rule quickly, and edits or saves one. */
export function InsuranceSettings({
  value,
  issues,
  lastRule,
  lastRuleLabel,
  locked,
  onChange,
}: InsuranceSettingsProps) {
  const { enabled, source, form } = value;
  const { data: saved = [] } = useInsuranceRules();
  const saveRule = useSaveInsuranceRule();
  const removeRule = useRemoveInsuranceRule();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [nameIssue, setNameIssue] = useState<string>();

  const setForm = (next: Partial<InsuranceRuleForm>) =>
    onChange({ ...value, source: CUSTOM_RULE, form: { ...form, ...next } });
  const choose = (id: string, rule: InsuranceRule) =>
    onChange({ ...value, source: id, form: toInsuranceRuleForm(rule) });

  const selectedSaved = saved.find((rule) => rule.id === source);

  function handleSave() {
    const trimmed = name.trim();
    if (trimmed === "") {
      setNameIssue("请输入规则名称");
      return;
    }
    const parsed = parseInsuranceRule(form);
    if (!parsed.ok) {
      setNameIssue("请先修正规则里的错误");
      return;
    }
    const existing = saved.find((rule) => rule.name === trimmed);
    const rule = existing ? { ...existing, rule: parsed.rule } : newSavedRule(trimmed, parsed.rule);
    saveRule.mutate(rule, {
      onSuccess: () => {
        setName("");
        setNameIssue(undefined);
        onChange({ ...value, source: rule.id });
      },
    });
  }

  function handleRemove() {
    if (selectedSaved && window.confirm(`删除规则「${selectedSaved.name}」？`)) {
      removeRule.mutate(selectedSaved.id, {
        onSuccess: () => onChange({ ...value, source: CUSTOM_RULE }),
      });
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-2">
      <Toggle
        label="保险"
        detail={
          locked ? "这局已有保险记录，不能关闭" : "开启后「保险」作为一席加入牌局，默认买入 1 手"
        }
        checked={enabled}
        disabled={locked}
        onChange={(checked) => onChange({ ...value, enabled: checked })}
      />

      {enabled && (
        <>
          <div>
            <span className="mb-2 block text-sm text-muted">赔率规则</span>
            <div className="flex flex-wrap gap-2">
              {lastRule && (
                <button
                  type="button"
                  aria-pressed={source === LAST_RULE}
                  onClick={() => choose(LAST_RULE, lastRule)}
                  className={pillClass(source === LAST_RULE)}
                >
                  {lastRuleLabel}
                </button>
              )}
              {BUILT_IN_RULES.map(({ id, name: ruleName, rule }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={source === id}
                  onClick={() => choose(id, rule)}
                  className={pillClass(source === id)}
                >
                  {ruleName}
                </button>
              ))}
              {saved.map(({ id, name: ruleName, rule }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={source === id}
                  onClick={() => choose(id, rule)}
                  className={pillClass(source === id)}
                >
                  {ruleName}
                </button>
              ))}
              {source === CUSTOM_RULE && (
                <span className={cn(pillClass(true), "inline-flex items-center")}>自定义</span>
              )}
            </div>
          </div>

          <button
            type="button"
            aria-expanded={editing}
            onClick={() => setEditing(!editing)}
            className="flex min-h-11 w-full items-center justify-between font-medium text-highlight"
          >
            修改赔率和规则
            <ChevronDown
              className={cn("size-5 transition-transform", editing && "rotate-180")}
              aria-hidden
            />
          </button>

          {editing && (
            <div className="flex flex-col gap-4">
              <div>
                <span className="mb-1 block text-sm text-muted">
                  每个 outs 的赔率（超过 {form.odds.length} 张不能投保）
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {form.odds.map((odds, i) => (
                    <TextField
                      // biome-ignore lint/suspicious/noArrayIndexKey: each row is the place for that many outs
                      key={i}
                      id={`odds-${i + 1}`}
                      label={`${i + 1} outs`}
                      value={odds}
                      issue={issues.odds?.includes(i + 1) ? "请填大于 0 的赔率" : undefined}
                      inputMode="decimal"
                      onChange={(next) =>
                        setForm({ odds: form.odds.map((o, j) => (j === i ? next : o)) })
                      }
                    />
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={form.odds.length <= 1}
                    onClick={() => setForm({ odds: form.odds.slice(0, -1) })}
                    className="min-h-11 rounded-xl border border-line font-medium disabled:opacity-40"
                  >
                    减少一行
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ odds: [...form.odds, lastOdds(form.odds)] })}
                    className="min-h-11 rounded-xl border border-line font-medium"
                  >
                    增加一行
                  </button>
                </div>
              </div>

              <Toggle
                label="命中时退还保费"
                detail="默认不退：赔付 = 保费 × 赔率"
                checked={form.refundPremium}
                onChange={(refundPremium) => setForm({ refundPremium })}
              />
              <Toggle
                label="平分牌算 outs"
                detail="默认不算：只有输掉底池的牌才算"
                checked={form.tieOuts === "include"}
                onChange={(checked) => setForm({ tieOuts: checked ? "include" : "exclude" })}
              />
              <Toggle
                label="翻牌全下可保转牌"
                detail="每次只保下一张，河牌总是可保"
                checked={form.coverTurn}
                onChange={(coverTurn) => setForm({ coverTurn })}
              />

              <div className="grid grid-cols-3 items-start gap-2">
                <TextField
                  id="max-pot-players"
                  label="底池人数上限"
                  value={form.maxPotPlayers}
                  issue={issues.maxPotPlayers && "2–10 或留空"}
                  inputMode="numeric"
                  onChange={(maxPotPlayers) => setForm({ maxPotPlayers })}
                />
                <TextField
                  id="turn-cap"
                  label="转牌保费上限"
                  value={form.turnCapPercent}
                  issue={issues.turnCapPercent && "1–1000 或留空"}
                  suffix="%"
                  inputMode="numeric"
                  onChange={(turnCapPercent) => setForm({ turnCapPercent })}
                />
                <TextField
                  id="river-cap"
                  label="河牌保费上限"
                  value={form.riverCapPercent}
                  issue={issues.riverCapPercent && "1–1000 或留空"}
                  suffix="%"
                  inputMode="numeric"
                  onChange={(riverCapPercent) => setForm({ riverCapPercent })}
                />
              </div>
              <p className="-mt-2 text-sm text-muted">留空表示不限；上限按底池的百分比算。</p>

              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <TextField
                    id="rule-name"
                    label="保存为规则，下次可直接选"
                    value={name}
                    issue={nameIssue}
                    inputMode="text"
                    onChange={(next) => {
                      setName(next);
                      setNameIssue(undefined);
                    }}
                  />
                </div>
                <button
                  type="button"
                  disabled={saveRule.isPending}
                  onClick={handleSave}
                  className="mt-6 min-h-12 shrink-0 rounded-xl border border-line px-4 font-medium disabled:opacity-60"
                >
                  保存
                </button>
              </div>
              {saveRule.isError && (
                <p role="alert" className="text-sm text-highlight">
                  保存失败，请重试。
                </p>
              )}
              {selectedSaved && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="min-h-11 text-sm text-highlight"
                >
                  删除规则「{selectedSaved.name}」
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
