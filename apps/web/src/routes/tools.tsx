import { createFileRoute } from "@tanstack/react-router";
import { InDevelopment } from "@/components/InDevelopment";
import { Page } from "@/components/Page";

export const Route = createFileRoute("/tools")({
  component: ToolsPage,
});

const TOOLS = [
  { name: "保险计算", detail: "按 outs 数算出赔率、赔付金额和保本额", milestone: "M3" },
  { name: "抽水计算", detail: "按比例和封顶算出每个底池的抽水", milestone: "M4" },
  { name: "荷官费", detail: "按每位玩家的在桌时长分摊荷官工资", milestone: "M2" },
] as const;

function ToolsPage() {
  return (
    <Page title="工具">
      <p className="mb-4 text-muted">不用开局也能单独使用的计算器。</p>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {TOOLS.map((tool) => (
          <li key={tool.name} className="flex min-h-18 items-center gap-4 px-4 py-3">
            <div className="flex-1">
              <p className="font-medium">{tool.name}</p>
              <p className="text-sm text-muted">{tool.detail}</p>
            </div>
            <InDevelopment milestone={tool.milestone} />
          </li>
        ))}
      </ul>
    </Page>
  );
}
