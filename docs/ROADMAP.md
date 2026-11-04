# Roadmap

Each milestone maps to a GitHub Milestone, and each feature in it maps to an issue.

## M0 Project start (done)

- [x] Choose the tech stack (see [ADRs 0001–0006](adr/))
- [x] pnpm monorepo: `apps/web` + `packages/core`
- [x] Engineering standards: TypeScript strict mode, Biome, Vitest + fast-check
- [x] Money utilities (integer cents) with tests
- [x] PWA shell: bottom/side navigation, installable, offline cache, new-version prompt
- [x] GitHub Actions: lint, type check, tests, build
- [x] Deploy to Cloudflare Pages, with a preview link for every PR

## M1 Core ledger (MVP: usable at a real game)

- Game setup: blinds, chip-to-cash ratio, currency
- Player list (stored locally in guest mode): add, search (name / pinyin initials)
- Ledger: buy-ins, rebuys and cash-outs in an append-only ledger, with undo
- Buying in by hands: one buy-in = xx big blinds, one row per seated player, quick hand adjustments
- Settlement: balance check (all wins and losses + rake + insurance = 0), fewest transfers
- Settlement results as an image, for sharing to a group chat
- Data export / import (JSON) as a backup

## M2 Timing and dealer fees

- Each player's time at the table (including leaving and coming back)
- Dealer fee rules: hourly rate, rounding for part hours

## M3 Insurance calculator

- Configurable odds table (by number of outs)
- Payout and break-even calculations
- Insurance records in the game ledger

## M4 Rake

- Rake rules: percentage, cap, no flop no drop
- Per-pot records and rake totals

## M5 Player reports

- Statistics by period: games played, total buy-ins, wins and losses, total time, profit per hour
- Export as image / CSV

## M6 Accounts and cloud

- Supabase: sign-in, cloud storage for the player list and past games, multi-device sync
- One-tap import of guest data into an account
- Leave room for plans and entitlements (monthly / per game), no payments yet

## M7 and beyond

- Player app: players view their own records through a link or by signing in
- Capacitor packaging for iOS / Android
- China version: Supabase instance and CDN in China (requires ICP filing), phone number / WeChat sign-in
- Payments: Stripe (Australia), WeChat Pay / Alipay (China)
