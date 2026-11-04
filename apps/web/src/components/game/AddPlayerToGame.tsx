import { type Player, parsePlayerName, searchPlayers } from "@holdem/core";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { newPlayer, usePlayers, useSavePlayer } from "@/data/players";

const MAX_SUGGESTIONS = 8;
/** 输入框失焦后稍等再收起候选，否则点候选时按钮已经消失。 */
const COLLAPSE_DELAY_MS = 150;

const pillClass =
  "inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 font-medium";

interface AddPlayerToGameProps {
  /** 已经在这局里的玩家，不再出现在候选里 */
  excludedIds: ReadonlySet<string>;
  onPick: (player: Player) => void;
}

/** 从玩家库选人买入；搜不到时可以直接新建。 */
export function AddPlayerToGame({ excludedIds, onPick }: AddPlayerToGameProps) {
  const { data: players = [] } = usePlayers();
  const savePlayer = useSavePlayer();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const available = players.filter(({ id }) => !excludedIds.has(id));
  const matches = searchPlayers(available, query).slice(0, MAX_SUGGESTIONS);
  const parsed = parsePlayerName(
    query,
    players.map(({ name }) => name),
  );
  const newName = parsed.ok && matches.length === 0 ? parsed.name : undefined;
  // 牌局开始后候选默认收起，给玩家列表留出位置
  const showMatches = query !== "" || focused || excludedIds.size === 0;

  function pick(player: Player) {
    setQuery("");
    onPick(player);
  }

  function handleCreate() {
    if (newName === undefined) return;
    const player = newPlayer(newName);
    savePlayer.mutate(player, { onSuccess: () => pick(player) });
  }

  return (
    <section className="mt-2">
      <TextField
        id="add-player"
        label="加入玩家：名字或拼音首字母"
        value={query}
        issue={savePlayer.isError ? "保存失败，请重试" : undefined}
        inputMode="text"
        onChange={setQuery}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), COLLAPSE_DELAY_MS)}
      />
      {showMatches && (matches.length > 0 || newName !== undefined) && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {matches.map((player) => (
            <li key={player.id}>
              <button type="button" onClick={() => pick(player)} className={pillClass}>
                {player.name}
              </button>
            </li>
          ))}
          {newName !== undefined && (
            <li>
              <button
                type="button"
                disabled={savePlayer.isPending}
                onClick={handleCreate}
                className={`${pillClass} border-accent disabled:opacity-60`}
              >
                新建「{newName}」
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
