import {
  chipDifference,
  chipsToCents,
  type Game,
  netCents,
  type PlayerNet,
  reopenGame,
  settleGame,
  settleTransfers,
  summarizeByPlayer,
} from "@holdem/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Page } from "@/components/Page";
import { useGame, useSaveGame } from "@/data/games";
import { useLedger } from "@/data/ledger";
import { usePlayers } from "@/data/players";
import { formatGameMoney } from "@/lib/currency";

export const Route = createFileRoute("/games/$gameId/settlement")({
  component: SettlementPage,
});

function SettlementPage() {
  const { gameId } = Route.useParams();
  const { data: game } = useGame(gameId);
  const { data: events } = useLedger(gameId);
  const { data: players } = usePlayers();

  if (!game || !events || !players) return null;

  const ledger = summarizeByPlayer(events);
  const names = new Map(players.map(({ id, name }) => [id, name]));
  const nameOf = (playerId: string) => names.get(playerId) ?? "未知玩家";
  const seated = ledger.filter((p) => p.seated).map((p) => nameOf(p.playerId));
  const difference = chipDifference(ledger);

  return (
    <Page title="结算">
      {seated.length > 0 ? (
        <Notice gameId={gameId}>
          还有 {seated.length} 人在桌：{seated.join("、")}。全部兑出后才能结算。
        </Notice>
      ) : difference !== 0 ? (
        <Notice gameId={gameId}>
          账目不平衡：兑出比买入{difference > 0 ? "多" : "少"}{" "}
          {Math.abs(difference).toLocaleString("zh-CN")} 筹码（
          {formatGameMoney(chipsToCents(Math.abs(difference), game.chipRatio), game.currency)}
          ）。请核对后修正记录。
        </Notice>
      ) : (
        <SettlementResult game={game} nets={netCents(ledger, game.chipRatio)} nameOf={nameOf} />
      )}
    </Page>
  );
}

function Notice({ gameId, children }: { gameId: string; children: ReactNode }) {
  return (
    <div role="status" className="rounded-xl border border-highlight bg-surface p-4">
      <p>{children}</p>
      <Link
        to="/games/$gameId"
        params={{ gameId }}
        className="mt-2 inline-flex min-h-11 items-center text-highlight"
      >
        回到账本
      </Link>
    </div>
  );
}

interface SettlementResultProps {
  game: Game;
  nets: PlayerNet[];
  nameOf: (playerId: string) => string;
}

function SettlementResult({ game, nets, nameOf }: SettlementResultProps) {
  const { currency, status } = game;
  const saveGame = useSaveGame();
  const transfers = settleTransfers(nets);
  const ranked = nets.toSorted((a, b) => b.net - a.net);

  function handleReopen() {
    if (window.confirm("重新打开这局？可以继续记账，之后要再次结算。")) {
      saveGame.mutate(reopenGame(game));
    }
  }

  return (
    <>
      <h2 className="text-lg font-semibold">转账方案</h2>
      {transfers.length === 0 ? (
        <p className="mt-2 text-muted">没有输赢，不需要转账。</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {transfers.map(({ from, to, amount }) => (
            <li
              key={`${from}-${to}`}
              className="flex min-h-14 items-center gap-2 rounded-xl border border-line bg-surface px-4"
            >
              <span className="min-w-0 truncate font-medium">{nameOf(from)}</span>
              <ArrowRight className="size-4 shrink-0 text-muted" aria-label="转给" />
              <span className="min-w-0 truncate font-medium">{nameOf(to)}</span>
              <span className="ml-auto shrink-0 text-lg font-semibold text-highlight">
                {formatGameMoney(amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 text-lg font-semibold">输赢</h2>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface px-4">
        {ranked.map(({ playerId, net }) => (
          <li key={playerId} className="flex min-h-12 items-center justify-between gap-4">
            <span className="min-w-0 truncate">{nameOf(playerId)}</span>
            <span className="shrink-0 font-medium">
              {formatGameMoney(net, currency, "exceptZero")}
            </span>
          </li>
        ))}
      </ul>

      {saveGame.isError && (
        <p role="alert" className="mt-2 text-sm text-highlight">
          保存失败，请重试。
        </p>
      )}

      <div className="pt-6 pb-8">
        {status === "open" ? (
          <button
            type="button"
            disabled={saveGame.isPending}
            onClick={() => saveGame.mutate(settleGame(game, Date.now()))}
            className="min-h-12 w-full rounded-xl bg-accent px-6 font-semibold text-accent-text disabled:opacity-60"
          >
            确认结算
          </button>
        ) : (
          <button
            type="button"
            disabled={saveGame.isPending}
            onClick={handleReopen}
            className="min-h-12 w-full rounded-xl border border-line px-6 font-medium disabled:opacity-60"
          >
            重新打开牌局
          </button>
        )}
      </div>
    </>
  );
}
