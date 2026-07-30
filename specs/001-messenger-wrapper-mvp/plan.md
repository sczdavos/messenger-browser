# Implementation Plan: MessengerBrowser MVP

**Branch**: `001-messenger-wrapper-mvp` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-messenger-wrapper-mvp/spec.md`

**Governing document**: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) v1.2.0

## Summary

Ship a hardened macOS container around `https://www.facebook.com/messages`. The application is a
main-process-only Electron program: it creates one window, points a sandboxed web view at Messenger,
and enforces navigation, permission, and download policy entirely from the main process. It injects
nothing into the remote page, attaches no preload to it, and — in the recommended architecture —
contains no preload and no IPC at all.

Research changed four things about the naive approach:

1. **`will-navigate` is not a sufficient allowlist chokepoint.** Electron's navigation throttle emits
   it only for renderer-initiated main-frame navigations. Enforcement is layered across four APIs
   (R-004).
2. **`setPermissionRequestHandler` alone leaves deny-by-default broken.** Most web APIs check before
   they request, so `setPermissionCheckHandler` must be implemented too, keyed on `requestingOrigin`
   because `webContents` is `null` for subframes and notification checks (R-005).
3. **Find does not justify the architecture it was driving** (R-011). Removing it collapses the
   design to a single `BrowserWindow` with zero preloads and zero IPC channels. This is the
   recommended MVP option.
4. **Three load-bearing assumptions have never been observed** against the live site. A blocking
   feasibility spike now precedes implementation ([spike.md](./spike.md)).

## Phase 0 Gate: Feasibility Spike (BLOCKING)

**Production implementation MUST NOT begin until [spike.md](./spike.md) has run and recorded a GO or
GO-WITH-AMENDMENTS decision.**

The plan rests on three unobserved assumptions, any of which can invalidate it:

| Assumption | Spike | If wrong |
| --- | --- | --- |
| Authentication challenges stay on enumerable paths | S-1, S-2 | The narrow-allowlist model in constitution v1.2.0 may be unworkable as written — a constitutional problem, not a code problem |
| Calls work in a hardened container, from a known origin | S-3, S-4, **S-5 (blocking)** | FR-028 and SC-010 fail; a cross-origin RTC iframe would silently break calls under a single-origin permission handler |
| Notifications survive a hidden window | **S-6 (blocking)**, S-7 | FR-058 and the hide-not-destroy lifecycle collapse; Chromium throttles hidden and occluded pages, which would defeat the product's core value |

**S-5 and S-6 carry explicit acceptance criteria (AC-S5-1…7, AC-S6-1…8) and are individually
blocking.** Either hitting its STOP condition halts the gate regardless of how the other sections
score.

- **S-5** must enumerate every origin requesting `media` and `notifications`, recording `permission`,
  raw and normalized `requestingOrigin`, `securityOrigin`, `embeddingOrigin`, `requestingUrl`,
  `mediaType`, `isMainFrame`, frame identity, and whether `webContents` is `null` — for checks and
  requests alike. Decisions are validated against a **permission-specific** allowlist keyed on the
  normalized origin. **Navigability never confers a permission**: an origin in the top-level
  navigation allowlist gains nothing, and a regression test asserts `https://www.messenger.com` is
  denied `media`.
- **S-6** must verify **actual message and notification arrival** — not `webContents` liveness — in
  six window states (visible-focused, visible-inactive, minimized, fully occluded, hidden, and ≥2 h
  idle) under both default throttling and `backgroundThrottling: false`, escalating through a
  recorded ladder and reporting reliability *and* resource cost (idle CPU ≤ 2%, RSS growth ≤ 50 MB
  over 2 h, energy impact not "High").

**Global rule**: every spike resolution must be an explicit enumerated allowlist entry or a bounded,
documented configuration change. Anything requiring a wildcard, a host-level exception, a dynamic or
per-session set, the `"null"` origin, or a relaxed security control means **stop and propose the
specification or constitution amendment first**.

Spike code lives in `spike/`, is throwaway, and is deleted rather than merged. It MUST NOT relax a
security control to obtain an answer — if a question can only be answered by disabling `sandbox` or
`contextIsolation`, "not viable under the constitution" *is* the finding.

## Architecture Options

### Option A — single window, no preload, no IPC (**RECOMMENDED**)

One `BrowserWindow` loading Messenger directly. Chrome requirements are met with native facilities:

| Requirement | Mechanism |
| --- | --- |
| FR-036 offline / load failure | `loadFile()` a local error page; retry is a plain `<a href>` to the canonical URL, which the allowlist permits |
| FR-040 blocked navigation | native `dialog.showMessageBox` — non-destructive, session page stays intact |
| FR-030 permission denied | native `dialog.showMessageBox` with an "Open Settings" button |

**Zero preload scripts. Zero IPC channels. No `contextBridge`.** Requires removing Find (FR-025 and
its FR-023 menu entry) — see R-011: `findInPage()` searches only the rendered DOM, and Messenger is a
virtualised list, so browser find matches only what is currently scrolled into view. It cannot search
a conversation, which is what a user pressing ⌘F wants. Messenger's own search does work.

### Option B — `BaseWindow` + two `WebContentsView`s (fallback)

Retained if Find is judged essential. Adds a local shell view, one preload, seven IPC channels, a
`contextBridge` surface, and manual layout math. Contract preserved in
[contracts/ipc-shell.md](./contracts/ipc-shell.md).

| | Option A | Option B |
| --- | --- | --- |
| Window model | one `BrowserWindow` | `BaseWindow` + 2 `WebContentsView` |
| Preload scripts | **0** | 1 |
| IPC channels | **0** | 7 |
| Modules | ~15 | ~20 |
| Contracts to review | 3 | 4 |

The removed surface is disproportionately security-sensitive: preload plus IPC is precisely what
Principle II constrains. With no channel file, sender-verification bugs, payload-validation bugs, and
`contextBridge` mistakes are unreachable by construction rather than prevented by review.

**Status: ADOPTED (confirmed 2026-07-29).** The spec is amended — FR-025 is removed (its identifier
retained so FR-026 onward keep their numbers) and Find is struck from FR-023. Everything below is
Option A. Option B remains documented only so that reviving Find later does not require redesigning
from scratch.

## Technical Context

**Language/Version**: TypeScript 5.x, `strict: true` plus `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` (Constitution XI). Node 24.18 (bundled with Electron 43).

**Primary Dependencies**: Electron 43.2.0 (pinned; Chromium 150, EOL 2027-01-05) · Electron Forge 7 ·
`@electron/osx-sign` · `@electron/notarize` · `@electron-forge/maker-dmg` ·
`@electron-forge/plugin-vite`. Runtime dependencies beyond Electron itself: **none**.

**Storage**: One persistent Electron session partition (`persist:messenger`), treated as opaque. One
small JSON settings file in `app.getPath('userData')` holding window bounds and zoom only.

**Testing**: Vitest for pure policy logic; Playwright `_electron` for application behaviour and the
security baseline; ESLint for static security assertions; a manual checklist for native dialogs.

**Target Platform**: macOS on Apple Silicon (arm64) — current major release and the one preceding it
(macOS 26 Tahoe, macOS 15 Sequoia as of this date). No universal binary.

**Project Type**: Desktop application, main process only.

**Performance Goals**: Cold launch to first Messenger paint under 3 seconds. Notification within 5
seconds of message arrival (SC-013). Policy evaluation is a pure synchronous function.

**Constraints**: No preload. No IPC. No DOM injection. No telemetry or remote logging. No
auto-update. arm64 only. Hardened Runtime with a three-entitlement minimum.

**Scale/Scope**: One user, one account, one window, one session. ~15 modules; the security-critical
surface is concentrated in `src/main/security/`.

## Constitution Check

*GATE: evaluated pre-Phase 0, post-Phase 1, and re-run after the Option A / spike revisions.*

| # | Principle | Pre-Phase 0 | Post-Phase 1 | **Re-run (Option A + spike)** |
| --- | --- | --- | --- | --- |
| I | Untrusted remote content | PASS | PASS | PASS |
| II | No native capability exposure | PASS | PASS | **PASS, strengthened** — zero preload, zero IPC; lint forbids a `preload` key existing |
| III | Isolation and sandboxing | PASS | PASS | **PASS, strengthened** — single factory + lint block ad-hoc window creation |
| IV | Minimal session persistence | PASS | PASS | PASS |
| V | No data collection | PASS | PASS | PASS — spike explicitly forbids recording message content |
| VI | No brittle DOM injection | PASS | PASS w/ deviation | **PASS w/ one deviation** — badge only; Find removal eliminates the second |
| VII | Navigation containment | PASS | PASS | **PASS, strengthened** — one canonical `decide()`, four allowlists, lint-enforced single import path |
| VIII | Minimal first release | PASS | PASS | **PASS, strengthened** — Option A is materially smaller |
| IX | Platform APIs over workarounds | PASS | PASS | PASS — native dialogs replace custom chrome |
| X | Fail safe on upstream change | PASS | PASS | PASS — spike S-8 tests the fail-safe assumptions themselves |
| XI | TypeScript strict | PASS | PASS | PASS |
| XII | Acceptance criteria + security impact | PASS | PASS | PASS |
| XIII | Trademark restraint | PASS | PASS | PASS — TODO(APP_ICON) open |
| XIV | Signed, notarized, minimum entitlements | PASS | PASS | PASS |

**Result**: no unjustified violations. Deviations reduced from two to one; see Complexity Tracking.

**Note on Principle X**: the spike is itself a Principle X activity — it verifies the application's
assumptions about a site it does not control *before* those assumptions are baked into shipped code.

## Project Structure

### Documentation (this feature)

```text
specs/001-messenger-wrapper-mvp/
├── plan.md                  # This file
├── spec.md
├── spike.md                 # Phase 0 blocking gate
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── navigation-policy.md     # canonical decide() + 4 allowlists + factory + assertions
│   ├── permissions.md
│   ├── menu-and-shortcuts.md
│   └── ipc-shell.md             # Option B only
└── checklists/requirements.md
```

### Source Code (repository root) — Option A

```text
spike/                            # THROWAWAY. Deleted after the gate. Never merged.

src/main/
├── index.ts                      # entry: single-instance lock, lifecycle wiring
├── window/
│   ├── main-window.ts            # the one BrowserWindow, via the factory
│   └── bounds-store.ts           # load/validate/persist bounds + zoom
├── security/
│   ├── policy/
│   │   ├── index.ts              # decide() — THE canonical entry point
│   │   ├── navigation-allowlist.ts   # 2a top-level Messenger surfaces
│   │   ├── auth-allowlist.ts         # 2b authentication paths
│   │   ├── permission-origins.ts     # 2c origins for camera/mic/notifications
│   │   ├── external-schemes.ts       # 2d schemes safe for openExternal
│   │   └── normalize-origin.ts       # pure origin normalizer; denies "null" origin
│   ├── remote-window-factory.ts  # THE only window constructor; HOLDS the webPreferences baseline
│   ├── permissions-policy.ts     # pure evaluatePermission(); no navigation-allowlist input
│   ├── navigation.ts             # wires the 4 layers -> decide()
│   ├── permissions.ts            # both handlers + device + display-media denial
│   └── external-open.ts          # re-validates scheme before shell.openExternal
├── session/
│   ├── partition.ts
│   └── clear-session.ts
└── features/
    ├── menu.ts                   # menu + macOS roles (no Find under Option A)
    ├── downloads.ts
    ├── badge.ts                  # page-title-updated -> setBadgeCount
    ├── errors.ts                 # loadFile error page, backoff
    ├── dialogs.ts                # blocked-navigation + permission-denied dialogs
    └── about.ts                  # About window (independence from Meta)

src/renderer-static/              # served via file://, NO preload, NO script
├── error.html                    # retry is a plain <a href> to the canonical URL
└── error.css

tests/
├── unit/policy/                  # Vitest — allowlists, schemes, totality, hostile set
├── unit/                         # bounds-store, badge-title parser
└── integration/                  # Playwright _electron
    ├── security-baseline.test.ts # THE assertion suite — release blocker
    ├── navigation.test.ts
    ├── lifecycle.test.ts
    └── menu.test.ts

build/entitlements.mac.plist
forge.config.ts · vitest.config.ts · playwright.config.ts · tsconfig.json · eslint.config.js
```

**Structure Decision**: single project at the repository root. `src/main/security/policy/` holds four
small frozen tables and one pure `decide()`; none imports Electron, which makes exhaustive
hostile-input unit testing cheap. `src/renderer-static/` contains no script and no preload — it is
inert HTML, which is why the error screen needs no IPC.

## Mandatory Implementation Requirements

These are not suggestions; each has a corresponding automated check.

**M-1 — One canonical navigation-policy module.** Exactly one `decide()`. Every navigation, redirect,
popup, and network-layer handler calls it. No handler pattern-matches a URL inline. Enforced by
ESLint `no-restricted-imports`: allowlist tables are importable only by `policy/index.ts` and its
tests. This prevents the layers from drifting apart, which is exactly how allowlist bypasses appear.

**M-2 — Four separate allowlists.** Top-level navigation, authentication, permission origins, and
external schemes are four distinct frozen tables in four files, not one table with a discriminator.
They have different owners, change cadences, and blast radii. See
[contracts/navigation-policy.md](./contracts/navigation-policy.md) §2.

**M-3 — One central remote-window factory.** `remote-window-factory.ts` is the only place a remote
window is constructed and the only place `webPreferences` is written — the hardened baseline is a
frozen constant **inside that file**, not a separate module, since the lint rule forbids the
identifier everywhere else. It exports `createRemoteWindow(initialUrl): BrowserWindow` and
`createRemotePopup(url, parent): BrowserWindow`, attaching all navigation, permission, device,
display-media, and download handlers in one place. Enforced by ESLint `no-restricted-syntax`
forbidding `new BrowserWindow(`, `new WebContentsView(`, `new BrowserView(`, and the `webPreferences`
identifier elsewhere.

**M-4 — Automated security assertions.** `tests/integration/security-baseline.test.ts` asserts, for
every remote window and popup: `sandbox`, `contextIsolation`, `webSecurity` true;
`nodeIntegration`, `nodeIntegrationInWorker`, `nodeIntegrationInSubFrames`,
`allowRunningInsecureContent`, `experimentalFeatures`, `webviewTag` false; **preload absent**;
partition is `persist:messenger`; all four navigation layers registered; both permission handlers
registered; device and display-media handlers denying. Plus a deny-by-default probe across the full
Electron permission enum, and static lint assertions (no `preload` key anywhere, no
`shell.openExternal` outside `external-open.ts`, no disabled-security literals). **Failure of this
suite is a release blocker regardless of any other result.**

## Key Design Decisions

**Lifecycle**: window `close` is intercepted and converted to `hide()`; only `before-quit` permits
teardown. Required for FR-058 — destroying the window kills the page that produces notifications.
**Contingent on spike S-6**: if Chromium throttling suspends a hidden page's websockets, this design
fails and needs rework before implementation.

**Popups**: `setWindowOpenHandler` returns `allow` (via the factory, same hardened preferences) for
allowlisted URLs, `deny` + `shell.openExternal` for safe-scheme external URLs, bare `deny` otherwise.

**Badge**: `page-title-updated` → regex for a leading `(N)` → `app.setBadgeCount`. Degrades to no
badge, never to an error.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Badge derived from the document title, a bounded coupling to site behaviour brushing against Principle VI | FR-056 requires a Dock unread badge, which the user approved. The title is the only unread signal reachable without DOM injection or a private API | DOM reading violates Principle VI outright; a Meta API violates Principle I and FR-049; dropping the badge loses an approved requirement. Bounded to one regex in one module, failing to "no badge" rather than a broken app |

*Resolved since the previous revision*: the local shell view + preload deviation is eliminated by
Option A (R-011).

## Open Risks

1. **Spike outcomes** (S-2 auth paths, S-4/S-5 calls, S-6 background notifications) — any may force a
   constitution or spec amendment before implementation. This is the expected case, not a failure.
2. **Electron 43 EOL 2027-01-05** — upgrade and full constitutional re-audit required before then.
3. **`TODO(SIGNING_IDENTITY)`, `TODO(APP_ICON)`** — block the first distributable build.
4. ~~Find removal requires a spec amendment~~ — **resolved 2026-07-29**: confirmed and applied to
   FR-023 and FR-025.
