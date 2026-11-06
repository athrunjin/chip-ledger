import { DEFAULT_GAME_SETTINGS, type GameSettings } from "@holdem/core";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "@/components/insurance/Modal";
import { TextField } from "@/components/TextField";
import {
  newGameConfig,
  useGameConfigs,
  useRemoveGameConfig,
  useSaveGameConfig,
} from "@/data/game-configs";
import { cn } from "@/lib/cn";
import { FormDialog } from "./FormDialog";

export const LAST_CONFIG = "last";
const DEFAULT_CONFIG = "default";

export interface GameConfigChoice {
  readonly id: string;
  readonly name: string;
  /** Missing means last time's setup, which the page already has. */
  readonly settings?: GameSettings;
}

const DEFAULT_CHOICE: GameConfigChoice = {
  id: DEFAULT_CONFIG,
  name: "默认配置",
  settings: DEFAULT_GAME_SETTINGS,
};
const LAST_CHOICE: GameConfigChoice = { id: LAST_CONFIG, name: "上次配置" };

interface GameConfigPickerProps {
  /** The chosen config's ID, or null once it has been deleted */
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** Fills the form with a config */
  onApply: (choice: GameConfigChoice) => void;
  /** The form's settings, or null if they cannot be saved yet */
  readSettings: () => GameSettings | null;
}

/** Shows the config in use, and switches to another one or saves the current setup as one. */
export function GameConfigPicker({
  selected,
  onSelect,
  onApply,
  readSettings,
}: GameConfigPickerProps) {
  const { data: saved = [] } = useGameConfigs();
  const saveConfig = useSaveGameConfig();
  const removeConfig = useRemoveGameConfig();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<GameConfigChoice | null>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [nameIssue, setNameIssue] = useState<string>();
  const choices = [LAST_CHOICE, DEFAULT_CHOICE, ...saved];
  const selectedName = choices.find((choice) => choice.id === selected)?.name;

  function handleConfirm(choice: GameConfigChoice) {
    onApply(choice);
    setConfirming(null);
    setOpen(false);
  }

  function handleRemove(id: string, configName: string) {
    if (!window.confirm(`删除配置「${configName}」？`)) return;
    removeConfig.mutate(id, {
      onSuccess: () => {
        if (selected === id) onSelect(null);
      },
    });
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      setNameIssue("请输入配置名称");
      return;
    }
    const settings = readSettings();
    if (!settings) {
      setNameIssue("请先修正保险规则里的错误");
      return;
    }
    const existing = saved.find((config) => config.name === trimmed);
    const config = existing ? { ...existing, settings } : newGameConfig(trimmed, settings);
    saveConfig.mutate(config, {
      onSuccess: () => {
        onSelect(config.id);
        setName("");
        setNaming(false);
      },
    });
  }

  const rowClass = (id: string) =>
    cn(
      "flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 px-3 text-left font-medium",
      selected === id && "text-highlight",
    );
  const check = (id: string) =>
    selected === id && <Check className="size-5 shrink-0" aria-label="当前选中" />;

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="ml-auto flex min-h-11 max-w-full items-center gap-0.5 text-sm text-muted"
      >
        <span className="truncate">{selectedName ?? "选择配置"}</span>
        <ChevronDown className="size-4 shrink-0" aria-hidden />
      </button>

      {open && (
        <Modal title="选择配置" onClose={() => setOpen(false)}>
          <ul className="divide-y divide-line rounded-xl border border-line">
            <li className="flex">
              <button
                type="button"
                onClick={() => setConfirming(DEFAULT_CHOICE)}
                className={rowClass(DEFAULT_CONFIG)}
              >
                恢复默认
                {check(DEFAULT_CONFIG)}
              </button>
            </li>
            <li className="flex">
              <button
                type="button"
                onClick={() => setConfirming(LAST_CHOICE)}
                className={rowClass(LAST_CONFIG)}
              >
                上次配置
                {check(LAST_CONFIG)}
              </button>
            </li>
            {saved.map((config) => (
              <li key={config.id} className="flex">
                <button
                  type="button"
                  onClick={() => setConfirming(config)}
                  className={rowClass(config.id)}
                >
                  <span className="truncate">{config.name}</span>
                  {check(config.id)}
                </button>
                <button
                  type="button"
                  aria-label={`删除配置 ${config.name}`}
                  onClick={() => handleRemove(config.id, config.name)}
                  className="grid min-h-12 w-12 shrink-0 place-items-center text-muted"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-11 rounded-xl border border-line font-medium"
            >
              关闭
            </button>
            <button
              type="button"
              onClick={() => {
                setNameIssue(undefined);
                setNaming(true);
              }}
              className="min-h-11 rounded-xl border border-line font-medium text-highlight"
            >
              保存当前配置
            </button>
          </div>
        </Modal>
      )}

      {confirming && (
        <Modal title="使用配置" onClose={() => setConfirming(null)}>
          <p>是否使用{confirming.name}？</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="min-h-11 rounded-xl border border-line font-medium"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => handleConfirm(confirming)}
              className="min-h-11 rounded-xl bg-accent font-semibold text-accent-text"
            >
              确认
            </button>
          </div>
        </Modal>
      )}

      {naming && (
        <FormDialog
          title="保存当前配置"
          submitLabel="保存"
          saving={saveConfig.isPending}
          saveFailed={saveConfig.isError}
          onSubmit={handleSave}
          onClose={() => setNaming(false)}
        >
          <TextField
            id="config-name"
            label="配置名称，同名会覆盖"
            value={name}
            issue={nameIssue}
            inputMode="text"
            onChange={(next) => {
              setName(next);
              setNameIssue(undefined);
            }}
          />
        </FormDialog>
      )}
    </>
  );
}
