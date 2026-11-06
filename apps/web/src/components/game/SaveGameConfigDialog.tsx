import type { GameSettings } from "@holdem/core";
import { type FormEvent, useState } from "react";
import { TextField } from "@/components/TextField";
import { newGameConfig, useGameConfigs, useSaveGameConfig } from "@/data/game-configs";
import { FormDialog } from "./FormDialog";

interface SaveGameConfigDialogProps {
  settings: GameSettings;
  onSaved: (id: string) => void;
  onClose: () => void;
}

export function SaveGameConfigDialog({ settings, onSaved, onClose }: SaveGameConfigDialogProps) {
  const { data: saved = [] } = useGameConfigs();
  const saveConfig = useSaveGameConfig();
  const [name, setName] = useState("");
  const [issue, setIssue] = useState<string>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      setIssue("请输入配置名称");
      return;
    }
    const existing = saved.find((config) => config.name === trimmed);
    const config = existing ? { ...existing, settings } : newGameConfig(trimmed, settings);
    saveConfig.mutate(config, { onSuccess: () => onSaved(config.id) });
  }

  return (
    <FormDialog
      title="保存当前配置"
      submitLabel="保存"
      saving={saveConfig.isPending}
      saveFailed={saveConfig.isError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        id="config-name"
        label="配置名称，同名会覆盖"
        value={name}
        issue={issue}
        inputMode="text"
        onChange={(next) => {
          setName(next);
          setIssue(undefined);
        }}
      />
    </FormDialog>
  );
}
