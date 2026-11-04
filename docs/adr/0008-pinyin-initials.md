# 0008. Generate pinyin initials in the app layer with pinyin-pro

- Status: Accepted
- Date: 2026-11-04

## Context

The player list has to be searchable by pinyin initials so players can be picked quickly when a game starts. Converting Chinese to pinyin needs a dictionary, and surnames with several readings (单, 曾) must use their surname reading.

## Options considered

- A hand-written map of common characters: small, but poor on rare characters and multiple readings.
- The browser's `Intl.Collator` pinyin ordering: sorts only, and can't produce initials.
- Server-side generation: guest mode has no server.
- **pinyin-pro**: has a surname mode and per-character initials, and is actively maintained.

## Decision

- `apps/web` depends on `pinyin-pro`, generates initials when a player is saved, and writes them to `Player.initials`. Search compares strings only, with no dictionary needed.
- `core` doesn't depend on a pinyin library: initials are passed in as a field, and search logic stays in `core`.

## Consequences

- The pinyin dictionary is about 288 KB bundled (about 143 KB gzipped). Routes load it on demand so it stays out of the first screen, but the PWA still precaches it.
- After an algorithm or dictionary update, saved initials don't refresh on their own. They're regenerated when a name is edited.
- Other clients that write players must generate initials themselves.
