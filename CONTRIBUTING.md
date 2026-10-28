# 开发规范

## 分支

- `main`：始终可发布。只通过 Pull Request 合并，CI 必须通过。
- 功能分支从 `main` 拉出，命名：`<类型>/<简短描述>`，例如 `feat/buy-in-ledger`、`fix/settlement-rounding`。

## 提交信息

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

```
<类型>(<范围>): <说明>
```

| 类型       | 用途               |
| ---------- | ------------------ |
| `feat`     | 新功能             |
| `fix`      | 修复 bug           |
| `refactor` | 重构（不改变行为） |
| `test`     | 测试               |
| `docs`     | 文档               |
| `chore`    | 构建、依赖、配置   |
| `ci`       | 持续集成           |

范围用包名或功能名：`core`、`web`、`settlement`、`insurance` 等。

示例：`feat(core): 结算时计算最少转账方案`

## 代码

- TypeScript 严格模式，不用 `any`。
- 金额一律用 `@holdem/core` 的 `Cents`（整数分），不用浮点数做金额运算。见 [ADR 0004](docs/adr/0004-money-as-integer-cents.md)。
- 业务规则写在 `packages/core`，界面组件里只做展示和交互。
- `core` 里的计算函数必须有单元测试；涉及金额守恒的，加 fast-check 性质测试。
- 提交前运行 `pnpm check`。格式问题用 `pnpm format` 自动修复。

## 架构决策

做出影响长期结构的选择（新增依赖、改变数据模型、改变分层）时，在 `docs/adr/` 新增一篇决策记录，
按编号递增，格式参考已有文件。
