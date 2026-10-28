# 0006. pnpm 单仓库与工程工具

- 状态：已采纳
- 日期：2026-10-28

## 背景

业务核心要被多个应用复用（Web、以后的服务端、玩家端、原生 App），一个人维护，工具要简单。

## 考虑过的选项

- **单仓库**：pnpm workspaces（最简单）/ Turborepo（加缓存，易移除）/ Nx（功能全但重）
- **代码规范**：ESLint + Prettier（插件最全）/ Biome（一个工具同时检查和格式化，快）/ oxlint（最快但规则少）
- **测试**：Vitest / Jest；Playwright 做端到端

## 决定

- pnpm workspaces：`apps/*` 放应用，`packages/*` 放共享包；包多、构建变慢时再加 Turborepo。
- Biome 负责代码检查和格式化。
- Vitest 做单元测试，fast-check 做性质测试，Playwright 做端到端测试（M1 起）。
- GitHub Actions 在每次推送和 PR 时运行 `lint → typecheck → test → build`。
- 提交信息遵循 Conventional Commits。

## 后果

- 包之间通过 `workspace:*` 引用，`@holdem/core` 直接以 TypeScript 源码导出，无需单独构建。
- Biome 的 React 专用规则比 ESLint 插件少；若以后需要，可以单独加 ESLint 规则补充。
