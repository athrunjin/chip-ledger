import { parsePlayerName, searchPlayers } from "@holdem/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { Page } from "@/components/Page";
import { GUEST_ORGANIZER_ID } from "@/data";
import { usePlayers, useSavePlayer } from "@/data/players";
import { toInitials } from "@/lib/pinyin";
import { PLAYER_NAME_ISSUE_TEXT } from "@/lib/player-name";

export const Route = createFileRoute("/players/")({
  component: PlayersPage,
});

function PlayersPage() {
  const { data: players = [], isPending } = usePlayers();
  const savePlayer = useSavePlayer();
  const [query, setQuery] = useState("");

  const matches = searchPlayers(players, query);
  const parsed = parsePlayerName(
    query,
    players.map((player) => player.name),
  );
  // 搜不到时可以直接把搜索词加成新玩家，不用再填一次
  const newName = parsed.ok && matches.length === 0 ? parsed.name : undefined;
  const tooLong = !parsed.ok && parsed.issue === "too-long";

  function handleAdd() {
    if (newName === undefined) return;
    savePlayer.mutate(
      {
        id: crypto.randomUUID(),
        organizerId: GUEST_ORGANIZER_ID,
        name: newName,
        initials: toInitials(newName),
        createdAt: Date.now(),
      },
      { onSuccess: () => setQuery("") },
    );
  }

  return (
    <Page title="玩家">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleAdd();
        }}
      >
        <div className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-highlight">
          <Search className="size-5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            aria-label="搜索或添加玩家"
            placeholder="输入名字或拼音首字母"
            autoComplete="off"
            enterKeyHint="done"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-11 w-full min-w-0 bg-transparent text-lg outline-none placeholder:text-base placeholder:text-muted"
          />
        </div>
        {tooLong && (
          <p className="mt-1 text-sm text-highlight">{PLAYER_NAME_ISSUE_TEXT["too-long"]}</p>
        )}
        {newName !== undefined && (
          <button
            type="submit"
            disabled={savePlayer.isPending}
            className="mt-2 min-h-12 w-full rounded-xl bg-accent px-4 font-semibold text-accent-text disabled:opacity-60"
          >
            添加「{newName}」
          </button>
        )}
        {savePlayer.isError && (
          <p role="alert" className="mt-1 text-sm text-highlight">
            保存失败，请重试。
          </p>
        )}
      </form>

      {!isPending && players.length === 0 && query === "" && (
        <div className="mt-4 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <p className="text-lg font-medium">玩家库是空的</p>
          <p className="mx-auto mt-2 max-w-sm text-muted">
            把常来的玩家加进来，开局时输入名字或拼音首字母就能快速选人。
          </p>
        </div>
      )}

      {matches.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 pb-6">
          {matches.map(({ id, name, initials }) => (
            <li key={id}>
              <Link
                to="/players/$playerId"
                params={{ playerId: id }}
                className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4"
              >
                <span className="min-w-0 truncate font-medium">{name}</span>
                <span className="shrink-0 text-sm text-muted">{initials}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
