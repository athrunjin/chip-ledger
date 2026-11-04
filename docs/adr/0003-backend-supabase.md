# 0003. Back end: Supabase, designed for multi-region deployment

- Status: Accepted
- Date: 2026-10-28

## Context

- After sign-in, the player list and past games need cloud storage and multi-device sync.
- The product will be monetized later (monthly plan or per-game fee).
- Users in mainland China need to be considered.

## Options considered

|                | Supabase                                                                                                                                                            | Firebase                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Mainland China | The official cloud is slow and unreliable there, but it's **open source and self-hostable**: Alibaba Cloud RDS Supabase, MemFire Cloud or self-hosted, with only the address changing on the client | Auth, Firestore, functions and storage are largely unreachable there, it **can't be self-hosted**, and a China version would need a rewritten back end |
| Data model     | Postgres, which suits relational player–game–ledger data and reporting                                                                                               | Firestore is NoSQL and awkward for reporting; SQL Connect still runs on Google Cloud                           |
| Other          | The free tier pauses after a week without traffic (use Pro in production); row-level security takes some learning                                                    | Most mature, Firestore has built-in offline support; locked to Google's platform                               |

Also considered: PocketBase (simple and cheap, small ecosystem), Convex (closed source) and a custom FastAPI service
(the ledger logic would need a second Python version that's hard to keep in step with the TypeScript one).

## Decision

Use Supabase. The first phase deploys only an Australian instance (Sydney region), but the architecture supports multiple regions from day one:

- The server address is injected through configuration, never hard-coded.
- Schema changes are kept in the repository as SQL migrations that can be applied to any Supabase instance.
- Business rules stay in `packages/core` with no dependency on Supabase-specific features.
- A China version will have its own instance later (data stays in China), with the front end on a Chinese CDN.

## Consequences

- Launching in China requires ICP filing and domestic SMS / WeChat sign-in.
- Plans and entitlements are modeled in the database with access controlled by row-level security. Payment channels come later (Stripe / WeChat Pay / Alipay).
- India blocked the Supabase domain in February 2026, which shows platform domains can be blocked. Use a custom domain or proxy if needed.
