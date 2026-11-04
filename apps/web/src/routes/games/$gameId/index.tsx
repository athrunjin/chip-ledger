import { createFileRoute, Link } from "@tanstack/react-router";
import { InDevelopment } from "@/components/InDevelopment";
import { Page } from "@/components/Page";
import { useGame } from "@/data/games";
import { CURRENCY_INFO, formatGameMoney } from "@/lib/currency";

export const Route = createFileRoute("/games/$gameId/")({
  component: GamePage,
});

function GamePage() {
  const { gameId } = Route.useParams();
  const { data: game, isPending } = useGame(gameId);

  if (isPending) return null;
  if (!game) {
    return (
      <Page title="牌局">
        <p className="text-muted">找不到这局牌。</p>
        <Link to="/" className="mt-2 inline-flex min-h-11 items-center text-highlight">
          回到牌局列表
        </Link>
      </Page>
    );
  }

  const { currency, smallBlind, bigBlind, chipRatio } = game;
  return (
    <Page
      title={`${formatGameMoney(smallBlind, currency)} / ${formatGameMoney(bigBlind, currency)}`}
      actions={
        <Link
          to="/games/$gameId/settings"
          params={{ gameId }}
          className="inline-flex min-h-11 shrink-0 items-center text-highlight"
        >
          修改设置
        </Link>
      }
    >
      <dl className="divide-y divide-line rounded-xl border border-line bg-surface px-4">
        <div className="flex min-h-12 items-center justify-between gap-4">
          <dt className="text-muted">货币</dt>
          <dd>{CURRENCY_INFO[currency].label}</dd>
        </div>
        <div className="flex min-h-12 items-center justify-between gap-4">
          <dt className="text-muted">筹码比例</dt>
          <dd>
            {chipRatio.chips.toLocaleString("zh-CN")} 筹码 ={" "}
            {formatGameMoney(chipRatio.amount, currency)}
          </dd>
        </div>
      </dl>
      <div className="mt-6 flex items-center gap-3">
        <h2 className="text-lg font-semibold">账本</h2>
        <InDevelopment milestone="M1" />
      </div>
    </Page>
  );
}
