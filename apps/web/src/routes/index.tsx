import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/Page";
import { useGames } from "@/data/games";
import { formatGameMoney } from "@/lib/currency";

export const Route = createFileRoute("/")({
  component: SessionsPage,
});

const STARTED_AT = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function SessionsPage() {
  const { data: games = [] } = useGames();

  return (
    <Page title="牌局">
      <section className="flex flex-col items-center gap-6 py-10 text-center md:py-16">
        {/* 开局按钮做成一枚筹码：页面唯一的视觉重点 */}
        <Link
          to="/games/new"
          className="group relative grid size-44 place-items-center rounded-full bg-felt-700 text-bone shadow-[0_6px_0_0_rgb(0_0_0/0.25)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_0_rgb(0_0_0/0.25)]"
        >
          <span
            aria-hidden
            className="absolute inset-3 rounded-full border-[3px] border-dashed border-chip-gold/80"
          />
          <span className="text-2xl font-bold [font-stretch:125%]">开一局</span>
        </Link>
        {games.length === 0 && (
          <div className="max-w-sm space-y-3">
            <p className="text-lg font-medium">还没有进行中的牌局</p>
            <p className="text-muted">
              开局后可以记录每位玩家的买入、补码和兑出，散局时自动算出谁该转给谁多少。
            </p>
          </div>
        )}
      </section>

      {games.length > 0 && (
        <ul className="flex flex-col gap-2 pb-6">
          {games.map(({ id, currency, smallBlind, bigBlind, status, createdAt }) => (
            <li key={id}>
              <Link
                to="/games/$gameId"
                params={{ gameId: id }}
                className="flex min-h-16 items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4"
              >
                <span className="font-medium">
                  {formatGameMoney(smallBlind, currency)} / {formatGameMoney(bigBlind, currency)}
                </span>
                <span className="text-sm text-muted">
                  {status === "open" ? "进行中" : "已结算"} · {STARTED_AT.format(createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
