# 0002. Front-end stack: React + Vite + TanStack Router + Tailwind

- Status: Accepted
- Date: 2026-10-28

## Context

Long-term extensibility comes first: a player app, native apps and more data features will follow.

## Options considered

- **Framework**: React (largest ecosystem, smooth path to React Native) / Vue 3 (easy to learn, mature Chinese mobile component libraries) / Svelte 5 (less code but a smaller ecosystem)
- **Build**: Vite single-page app / Next.js (its main strength is server rendering, which an offline PWA can't use) / TanStack Start (API still changing often)
- **UI**: Tailwind + shadcn/ui (source owned, no runtime) / Ionic (native look but hard to customize) / Ant Design Mobile / MUI
- **State**: Zustand / Redux Toolkit / Jotai

## Decision

- React 19 + TypeScript (strict mode)
- Vite single-page app + TanStack Router (type-safe file routes with automatic code splitting per route)
- Tailwind CSS v4, with components kept in the project in the style of shadcn/ui
- Zustand for UI state and TanStack Query for remote data (caching, retries, optimistic updates)
- vite-plugin-pwa to generate the service worker and manifest
- Fonts bundled locally (@fontsource) rather than loaded from Google Fonts, so they work in mainland China

## Consequences

- No server rendering is needed, so the front end can deploy to any static host.
- UI components are owned by the project, which must ensure mobile touch sizes (at least 44px) and accessibility itself.
