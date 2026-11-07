# Contributing

## Branches

- `main` is always releasable. It only changes through pull requests, and CI must pass.
- Feature branches start from `main` and are named `<type>/<short-description>`, for example `feat/buy-in-ledger` or `fix/settlement-rounding`.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/en/):

```
<type>(<scope>): <description>
```

| Type       | Purpose                       |
| ---------- | ----------------------------- |
| `feat`     | New feature                   |
| `fix`      | Bug fix                       |
| `refactor` | Refactor (no behavior change) |
| `test`     | Tests                         |
| `docs`     | Documentation                 |
| `chore`    | Build, dependencies, config   |
| `ci`       | Continuous integration        |

The scope is a package or feature name: `core`, `web`, `settlement`, `insurance` and so on.

Example: `feat(core): compute minimal settlement transfers`

## Language

Everything in the repository and on GitHub is written in English: commit messages, branch names,
pull requests, issues, comments, documentation, code comments and test names.

Two things stay in Simplified Chinese: the app's interface text, and sample data in tests that
exercise Chinese names.

## Code

- TypeScript strict mode, no `any`.
- Money always uses `Cents` (integer cents) from `@holdem-knight/core`, never floating-point arithmetic. See [ADR 0004](docs/adr/0004-money-as-integer-cents.md).
- Business rules go in `packages/core`. UI components only handle display and interaction.
- Calculations in `core` must have unit tests. Anything that conserves money also gets a fast-check property test.
- Run `pnpm check` before committing. `pnpm format` fixes formatting.

## Architecture decisions

When a choice affects the long-term structure (a new dependency, a data model change, a layering change),
add a decision record to `docs/adr/`. Number it next in sequence and follow the format of the existing files.
