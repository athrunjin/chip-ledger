import { createFileRoute } from "@tanstack/react-router";
import { InDevelopment } from "@/components/InDevelopment";
import { Page } from "@/components/Page";

export const Route = createFileRoute("/me")({
  component: MePage,
});

function MePage() {
  return (
    <Page title="我的">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="font-medium">游客模式</p>
        <p className="mt-1 text-sm text-muted">
          记录只保存在这台设备上。登录后可以保存玩家库和历史牌局，并在多台设备间同步。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled
            className="h-11 rounded-xl bg-accent px-5 font-semibold text-accent-text disabled:opacity-60"
          >
            登录
          </button>
          <InDevelopment milestone="M6" />
        </div>
      </section>
      <p className="mt-6 text-center text-xs text-muted">德州之王 · 开发版 {__APP_VERSION__}</p>
    </Page>
  );
}
