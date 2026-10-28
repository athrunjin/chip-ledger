# CLAUDE.md

给 AI 编程助手（Claude Code 等）的项目说明。人类开发者请先看 README.md 和 CONTRIBUTING.md。

## 项目

线下德州扑克组局助手（PWA）：买入记账、结算、保险、抽水、计时、玩家报告。
面向组织者，手机 / 平板优先。界面文案用简体中文。路线图见 docs/ROADMAP.md。

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器（apps/web）
pnpm test             # 全部单元测试
pnpm typecheck        # 类型检查
pnpm lint             # Biome 检查；pnpm format 自动修复
pnpm check            # 提交前完整检查：lint + typecheck + test + build
```

## 结构与分层

- `packages/core`：纯业务逻辑（金额、结算、保险、抽水、计时）。只放纯函数和类型，
  不访问网络、数据库、DOM，不依赖其他包。所有算钱的规则都写在这里。
- `apps/web`：React 19 + Vite + TanStack Router（文件路由在 `src/routes/`，
  `routeTree.gen.ts` 自动生成且需提交）+ Tailwind v4。只做展示和交互。
- 依赖方向：`apps → packages`，反过来不行。

## 必须遵守

- 金额一律用 `@holdem/core` 的 `Cents`（整数分）。乘比例用 `multiply` 并显式选取整方式，
  拆分用 `allocate`。不要用浮点数做金额运算（ADR 0004）。
- 计时记录时间戳、用差值计算，不依赖持续运行的定时器（ADR 0001）。
- 账本是只追加事件；撤销是追加一条冲正事件，不修改旧记录（ADR 0005）。
- 存储通过数据仓库接口访问：游客模式 = 本机 Dexie，账户模式 = Supabase（ADR 0005）。
- `core` 的计算函数必须有 Vitest 单元测试；涉及金额守恒的加 fast-check 性质测试。
- TypeScript 严格模式，不用 `any`。触控目标不小于 44px。
- 提交信息用 Conventional Commits，中文说明，例如 `feat(core): 结算时计算最少转账方案`。
- 影响长期结构的决定，在 `docs/adr/` 新增一篇记录。

## 设计令牌

牌桌绒布绿为底，筹码金为唯一强调色；深色是主要场景。令牌定义在 `apps/web/src/styles.css`。
