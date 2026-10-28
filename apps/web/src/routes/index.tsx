import { createFileRoute } from "@tanstack/react-router";
import { InDevelopment } from "@/components/InDevelopment";
import { Page } from "@/components/Page";

export const Route = createFileRoute("/")({
  component: SessionsPage,
});

function SessionsPage() {
  return (
    <Page title="牌局">
      <section className="flex flex-col items-center gap-6 py-10 text-center md:py-16">
        {/* 开局按钮做成一枚筹码：页面唯一的视觉重点 */}
        <button
          type="button"
          disabled
          aria-describedby="new-session-hint"
          className="group relative grid size-44 place-items-center rounded-full bg-felt-700 text-bone shadow-[0_6px_0_0_rgb(0_0_0/0.25)] transition-transform enabled:active:translate-y-1 enabled:active:shadow-[0_2px_0_0_rgb(0_0_0/0.25)] disabled:cursor-not-allowed"
        >
          <span
            aria-hidden
            className="absolute inset-3 rounded-full border-[3px] border-dashed border-chip-gold/80"
          />
          <span className="text-2xl font-bold [font-stretch:125%]">开一局</span>
        </button>
        <div id="new-session-hint" className="max-w-sm space-y-3">
          <p className="text-lg font-medium">还没有进行中的牌局</p>
          <p className="text-muted">
            开局后可以记录每位玩家的买入、补码和兑出，散局时自动算出谁该转给谁多少。
          </p>
          <InDevelopment milestone="M1" />
        </div>
      </section>
    </Page>
  );
}
