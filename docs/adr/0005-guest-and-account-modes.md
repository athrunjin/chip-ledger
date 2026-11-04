# 0005. Guest and account modes, with storage behind a repository interface

- Status: Accepted
- Date: 2026-10-28

## Context

Live games almost always have a network, so a full offline sync engine isn't needed. But when signed out or briefly offline,
the app should still work as a plain ledger and calculator.

## Options considered

- Offline first with a sync engine (Dexie Cloud, PowerSync, ElectricSQL, Zero and others): high complexity, and some options are immature or paid.
- Online only: unusable when offline or signed out.
- **Two modes**: guest mode stores data locally, account mode is mainly online.

## Decision

| Mode    | When                 | Data location             | Features                                                     |
| ------- | -------------------- | ------------------------- | ------------------------------------------------------------ |
| Guest   | Signed out or offline | Local IndexedDB (Dexie)  | Ledger, settlement, insurance / rake calculations            |
| Account | Signed in            | Supabase, mainly online   | Everything: player list, history, reports, multiple devices  |

- Define one **repository interface** with local and Supabase implementations. UI and business logic depend only on the interface.
- The ledger uses **append-only events** (buy-ins, rebuys, cash-outs, insurance and rake are each an event, and balances are derived from events).
  This makes undo and auditing easy and leaves almost no conflicts for any future sync approach.
- Brief network drops are handled by TanStack Query's retries and optimistic updates.
- After sign-in, guest data can be imported into the account with one tap.

## Consequences

- A new storage back end (for example a China instance or a read-only player API) only needs a new repository implementation.
- Every record carries an organizer ID from the start, leaving room for multiple organizers or clubs.
