# 0006. pnpm monorepo and engineering tools

- Status: Accepted
- Date: 2026-10-28

## Context

The business core has to be reused by several apps (web, and later a server, player app and native app). One person maintains it, so the tooling has to stay simple.

## Options considered

- **Monorepo**: pnpm workspaces (simplest) / Turborepo (adds caching, easy to remove) / Nx (full-featured but heavy)
- **Lint and format**: ESLint + Prettier (most plugins) / Biome (one fast tool for both) / oxlint (fastest but fewer rules)
- **Testing**: Vitest / Jest, with Playwright for end-to-end tests

## Decision

- pnpm workspaces: apps in `apps/*` and shared packages in `packages/*`. Add Turborepo if packages multiply and builds slow down.
- Biome handles linting and formatting.
- Vitest for unit tests, fast-check for property tests, Playwright for end-to-end tests (from M1).
- GitHub Actions runs `lint → typecheck → test → build` on every push and PR.
- Commit messages follow Conventional Commits.

## Consequences

- Packages reference each other with `workspace:*`, and `@holdem/core` exports its TypeScript source directly with no separate build.
- Biome has fewer React-specific rules than the ESLint plugins. ESLint rules can be added alongside it if needed.
