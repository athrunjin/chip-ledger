# 架构决策记录（ADR）

记录影响项目长期结构的决策：当时的背景、考虑过的选项、最终选择和代价。
决策一旦记录不再修改；如果之后改变主意，新写一篇并把旧的标记为「已被 XXXX 取代」。

| 编号                                    | 标题                                                  | 状态   |
| --------------------------------------- | ----------------------------------------------------- | ------ |
| [0001](0001-pwa-first.md)               | 应用形态：先做 PWA，以后用 Capacitor 打包             | 已采纳 |
| [0002](0002-frontend-stack.md)          | 前端技术栈：React + Vite + TanStack Router + Tailwind | 已采纳 |
| [0003](0003-backend-supabase.md)        | 后端：Supabase，按可多地区部署设计                    | 已采纳 |
| [0004](0004-money-as-integer-cents.md)  | 金额一律用整数分表示                                  | 已采纳 |
| [0005](0005-guest-and-account-modes.md) | 游客模式与账户模式，通过数据仓库接口隔离存储          | 已采纳 |
| [0006](0006-monorepo-and-tooling.md)    | pnpm 单仓库与工程工具                                 | 已采纳 |
| [0007](0007-domain-model-and-repository.md) | 领域模型和数据仓库接口放在 core，Dexie 实现放在 apps/web | 已采纳 |
| [0008](0008-pinyin-initials.md) | 用 pinyin-pro 在应用层生成拼音首字母 | 已采纳 |
| [0009](0009-backup-format.md) | JSON 备份用版本化格式，恢复时只新增不覆盖 | 已采纳 |
| [0010](0010-buy-in-hands.md) | 按手买入：牌局固定 1 手的筹码数，账本继续记录筹码 | 已采纳 |

## 模板

```markdown
# NNNN. 标题

- 状态：提议 / 已采纳 / 已被 NNNN 取代
- 日期：YYYY-MM-DD

## 背景

## 考虑过的选项

## 决定

## 后果
```
