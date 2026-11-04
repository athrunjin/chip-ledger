import { type Player, parsePlayerName, searchPlayers } from "@holdem/core";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { newPlayer, usePlayers, useSavePlayer } from "@/data/players";

const MAX_SUGGESTIONS = 8;
/** Wait briefly after the input loses focus before collapsing, or a tapped suggestion would already be gone. */
const COLLAPSE_DELAY_MS = 150;

const pillClass =
  "inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 font-medium";

interface AddPlayerToGameProps {
  /** Players already in this game, left out of the suggestions */
  excludedIds: ReadonlySet<string>;
  onPick: (player: Player) => void;
}

/** Pick a player from the list to buy in, or create one if the search finds nothing. */
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
  // Once the game has players, keep suggestions collapsed to leave room for the player list
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
