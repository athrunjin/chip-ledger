import { createFileRoute } from "@tanstack/react-router";
import { InDevelopment } from "@/components/InDevelopment";
import { Page } from "@/components/Page";

export const Route = createFileRoute("/players")({
  component: PlayersPage,
});

function PlayersPage() {
  return (
    <Page title="玩家">
      <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
        <p className="text-lg font-medium">玩家库是空的</p>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          把常来的玩家加进来，开局时输入名字或拼音首字母就能快速选人。
        </p>
        <div className="mt-4">
          <InDevelopment milestone="M1" />
        </div>
      </div>
    </Page>
  );
}
