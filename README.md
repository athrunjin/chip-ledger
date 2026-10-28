# 德州助手 · Holdem Assistant

线下德州扑克组局助手（产品名暂定）。帮组织者在牌局现场完成这些事：

- **买入记账与结算**：记录每位玩家的买入、补码、兑出，散局时自动核对平衡，并算出最少的转账方案
- **保险计算**：按 outs 数算出赔率、赔付金额和保本额
- **计时与荷官费**：按每位玩家的在桌时长计费
- **抽水**：按规则计算每个底池的抽水
- **固定玩家库**：输入名字或拼音首字母快速选人
- **玩家报告**：某个时段的参与场次、水上水下、游戏时长

手机、平板、电脑都能用，可以「添加到主屏幕」像 App 一样打开。

> 目前处于 **M0 项目起步** 阶段，功能尚未实现。进度见 [开发路线](docs/ROADMAP.md)。

## 技术栈

| 层       | 选择                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 形态     | PWA（以后用 Capacitor 打包上架）                                        |
| 前端     | React 19 + TypeScript + Vite + TanStack Router                          |
| 界面     | Tailwind CSS v4（组件按 shadcn/ui 的方式自有维护）                      |
| 状态     | Zustand（界面状态）+ TanStack Query（云端数据）                         |
| 本机存储 | Dexie / IndexedDB（游客模式）                                           |
| 后端     | Supabase（M6 接入；可多地区部署）                                       |
| 工程     | pnpm 单仓库 · Biome · Vitest + fast-check · Playwright · GitHub Actions |

每项选择的理由记录在 [架构决策记录（ADR）](docs/adr/) 中。

## 项目结构

```
apps/
  web/                # PWA 前端：界面、路由、交互
packages/
  core/               # 业务核心：金额、结算、保险、抽水、计时（纯函数，不依赖界面和数据库）
docs/
  ROADMAP.md          # 开发路线与里程碑
  adr/                # 架构决策记录
.github/workflows/    # 持续集成
```

依赖方向只能是 `apps → packages`，`packages/core` 不依赖任何其他包。算钱的逻辑全部放在 `core`，
以后的服务端、玩家端、原生 App 都复用它。

## 本地开发

需要 Node.js 22+ 和 pnpm 10（`corepack enable` 即可启用）。

```bash
pnpm install       # 安装依赖
pnpm dev           # 启动开发服务器（手机连同一 Wi-Fi 可用局域网地址访问）
pnpm test          # 运行单元测试
pnpm check         # 提交前完整检查：代码规范 + 类型 + 测试 + 构建
```

## 开发规范

见 [CONTRIBUTING.md](CONTRIBUTING.md)：分支命名、提交信息格式、代码规范。

## 版权

Copyright © 2026 Cheng Jin. 保留所有权利。

本仓库公开仅供查看开发过程，**未授予任何使用、复制、修改或分发的许可**。详见 [LICENSE](LICENSE)。
