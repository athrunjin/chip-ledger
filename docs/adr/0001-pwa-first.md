# 0001. App form: PWA first, packaged with Capacitor later

- Status: Accepted
- Date: 2026-10-28

## Context

Organizers work on a phone or tablet at the table and may read reports on a computer. One codebase has to cover every device,
be maintained by one person, and open quickly.

## Options considered

| Option                            | Pros                                                                                                                                       | Cons                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| PWA (Capacitor packaging later)   | One codebase; opens from a URL and can be added to the home screen; no store review, fixes ship instantly; Capacitor can reuse the same code | No background sync or automatic install prompt on iOS; animation feel slightly behind native |
| React Native + Expo               | Native feel                                                                                                                                | Web version is constrained (no HTML/CSS), larger bundles, web is an afterthought |
| Flutter                           | Consistent UI, smooth animation                                                                                                            | About 1MB first load on web, text drawn on canvas; requires learning Dart |
| Native plus a separate website    | Best experience                                                                                                                            | Three codebases, impossible for one person                               |

## Decision

Use a PWA. A tool built around forms, lists and number crunching doesn't need native graphics performance.
When app store distribution is needed, package the same web code with Capacitor.

## Consequences

- Timing can't rely on a running timer (iOS suspends background pages). Always record timestamps and compute differences.
- iOS users must "Add to Home Screen" by hand, so the app has to guide them.
- New versions arrive through the service worker with a refresh prompt rather than an automatic refresh, to avoid interrupting a game in progress.
