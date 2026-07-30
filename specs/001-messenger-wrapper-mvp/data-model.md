# Data Model: MessengerBrowser MVP

**Date**: 2026-07-29 | **Feature**: `001-messenger-wrapper-mvp`

The application stores almost nothing. There is exactly one persisted file it authors, one opaque
store it delegates to Electron, and a handful of in-memory types that carry security decisions.

---

## Persisted state

### `AppSettings` — the only file the application writes

**Location**: `<app.getPath('userData')>/settings.json`

```ts
interface AppSettings {
  schemaVersion: 1;
  windowBounds: { x: number; y: number; width: number; height: number };
  zoomLevel: number;   // Electron zoom level, not a percentage
}
```

**Validation rules**:

| Field | Rule | On violation |
| --- | --- | --- |
| `schemaVersion` | must equal `1` | discard file, use defaults |
| `width` / `height` | finite integers, `width >= 800`, `height >= 600` | clamp to minimum |
| `x` / `y` | finite integers; the bounds rectangle must intersect a display work area | reposition onto the primary display work area (FR-003, edge case: disconnected display) |
| `zoomLevel` | finite number in `[-3, 3]` | reset to `0` |
| whole file | must parse as JSON and match the shape | discard, use defaults, do not crash |

**Write discipline**: debounced (~500 ms) on window `resize`/`move`, and once on `before-quit`.
Written atomically — serialise to a temporary file in the same directory, then `rename` over the
target — so an interrupted write cannot leave a truncated file that fails to parse on next launch.

**What this file must never contain**: message content, credentials, cookies, tokens, contact data,
URLs visited, or any page-derived string. It holds geometry and zoom, and nothing else (FR-005,
FR-047).

### `MessengerSession` — delegated, opaque

**Location**: Electron's own storage for the `persist:messenger` partition, under `userData`.

The application never reads, parses, copies, exports, or backs up this store. It performs exactly
three operations on it:

| Operation | Trigger | Effect |
| --- | --- | --- |
| construct | app start | `session.fromPartition('persist:messenger')` |
| attach handlers | app start | permission, download, and `webRequest` handlers |
| clear | Clear Session Data (FR-017) | `clearStorageData()` + `clearCache()` + `clearAuthCache()` |

There is exactly one instance. No second partition, no profile switching, no import or export
(FR-018).

---

## In-memory security types

### `AllowlistRule`

```ts
interface AllowlistRule {
  host: string;                       // registrable domain, matched exact-or-subdomain
  kind: 'messenger' | 'auth' | 'redirect-absorption';
  paths: readonly string[] | 'any';   // whole-segment prefixes; 'any' = whole host
}
```

The rule table is a frozen constant mirroring the constitution's allowlist. It is the single
definition in the codebase; changing it requires a constitutional amendment. See
[contracts/navigation-policy.md](./contracts/navigation-policy.md).

### `NavigationDecision`

```ts
type NavigationDecision =
  | { action: 'allow-in-app'; matchedRule: AllowlistRule }
  | { action: 'open-external' }        // safe scheme, not on the allowlist
  | { action: 'block'; reason: BlockReason };

type BlockReason =
  | 'unsafe-scheme'       // javascript:, data:, file:, blob:, about:
  | 'not-https'           // http: for an otherwise-matching host
  | 'has-userinfo'        // https://www.facebook.com@evil.example/messages
  | 'malformed-url';
```

Produced by the pure function `decide(rawUrl: string): NavigationDecision`. No Electron import, no
I/O, no clock. Every enforcement layer calls this one function, which is why the layers cannot drift
apart.

**State transition on a redirect chain**: each hop produces its own independent decision. A previous
`allow-in-app` confers nothing on the next hop (FR-009).

### `PermissionDecision`

```ts
interface PermissionQuery {
  permission: string;                        // Electron permission string, treated as untrusted
  requestingOrigin: string;                  // authoritative — webContents may be null
  mediaType?: 'audio' | 'video' | 'unknown';
}
type PermissionDecision = { granted: boolean; reason: string };
```

Also a pure function. `requestingOrigin` is authoritative because `webContents` is `null` for
cross-origin subframes and for `notifications` checks. See
[contracts/permissions.md](./contracts/permissions.md).

### `BadgeState`

```ts
interface BadgeState { unreadCount: number; source: 'title' | 'none'; }
```

Derived from `page-title-updated` by a pure parser: a leading `(N)` yields `N`; anything else yields
`{ unreadCount: 0, source: 'none' }`. The parser must not throw on any input, must cap absurd values,
and must treat a non-matching title as "no badge" rather than an error (R-006). This is the one
bounded coupling to site behaviour, recorded in the plan's Complexity Tracking.

### `ShellUiState` — **Option B only**

> Not used in the recommended Option A architecture, which renders the offline/error screen as inert
> local HTML and uses native `dialog.showMessageBox` for blocked navigations and permission guidance.
> Retained for the Option B fallback.


```ts
type ShellUiState =
  | { mode: 'hidden' }
  | { mode: 'find'; query: string; activeMatch: number; totalMatches: number }
  | { mode: 'error'; kind: 'offline' | 'load-failed' | 'navigation-blocked'; detail: string };
```

Drives the local shell view's height and content. `navigation-blocked` is what makes FR-040 visible
rather than silent — it is the state shown when the allowlist refuses a navigation the user expected
to proceed, such as an unlisted authentication challenge.

`detail` is application-authored text. It must never embed page content; for
`navigation-blocked` it may contain the refused URL's origin and path, which the application already
holds, and nothing from the page body.

---

## Relationships

```text
AppSettings ──restores──> BrowserWindow bounds + zoom level
MessengerSession ──attached to──> the remote BrowserWindow (via remote-window-factory)

NavigationRequest (any of 4 layers)
        │
        └──> decide() ──> NavigationDecision ──┬── allow-in-app  ──> proceed
                                               ├── open-external ──> shell.openExternal
                                               └── block         ──> preventDefault
                                                                     └─> ShellUiState.error?

webContents.page-title-updated ──> parseBadge() ──> BadgeState ──> app.setBadgeCount()
```

## Explicit non-entities

The following are deliberately absent from the model, and their absence is a requirement rather than
an omission: message, conversation, contact, user profile, credential, cookie, token, notification
record, navigation history log, download history, and any analytics or telemetry event. The
application has no representation of a message at any layer (FR-047, FR-048).
