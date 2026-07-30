# Contract: Navigation Policy & Allowlists

**Modules**: `src/main/security/policy/*` (pure) + `src/main/security/navigation.ts` (wiring)

Supersedes the earlier `navigation-allowlist.md`. The single most security-critical contract in the
product: a defect here turns the application into an unrestricted browser carrying a live Messenger
session.

---

## 1. One canonical policy module

There is exactly **one** decision function. Every navigation handler, redirect handler, popup
handler, and network-layer backstop calls it. No handler implements its own matching, and no handler
may pattern-match a URL inline.

```ts
// src/main/security/policy/index.ts
export function decide(rawUrl: string): NavigationDecision;
```

Pure: no Electron import, no I/O, no clock, no randomness. **Total** — never throws, for any input
including malformed strings, empty strings, and values coerced from `unknown` at the boundary.

**Enforcement**: an ESLint `no-restricted-imports` rule forbids `src/main/security/policy/*`
allowlist tables from being imported anywhere except `policy/index.ts` and its tests. Handlers may
import `decide` and nothing else. This is what prevents the four enforcement layers from drifting
apart over time — the failure mode where a redirect handler and a navigation handler disagree is
exactly how allowlist bypasses appear.

---

## 2. Four separate allowlists

The four concerns have different owners, different change cadences, and different blast radii, so
they are four distinct frozen tables in four files — not one table with a `kind` discriminator.

### 2a. Top-level navigation allowlist

`src/main/security/policy/navigation-allowlist.ts` — which Messenger surfaces may load in-app.

| Host (exact-or-subdomain) | Paths (whole-segment) |
| --- | --- |
| `facebook.com` | `/messages`, `/messenger_media` |
| `messenger.com` | any (redirect absorption only — never an entry point) |

Changes require a constitutional amendment. Expected to grow after spike S-3 if calls use a distinct
path.

### 2b. Authentication allowlist

`src/main/security/policy/auth-allowlist.ts` — paths reachable in-app solely to complete sign-in.

| Host (exact-or-subdomain) | Paths (whole-segment) |
| --- | --- |
| `facebook.com` | `/login.php`, `/two_step_verification`, `/two_factor` |

Separate from 2a because it carries different risk and a different review standard: these paths exist
only to let authentication finish, they are the most likely to need additions after spike S-2, and
each addition widens the surface on which a crafted link can open a real login form inside app
chrome. Keeping them in their own file means a reviewer sees an auth-surface change as an auth-surface
change, not as a line in a larger table.

**Constraint**: this list MUST NOT be widened to a host-level `facebook.com` exception, whatever S-2
finds. If the challenge paths turn out to be unenumerable, that is a constitutional problem to solve
deliberately, not by relaxing this file.

### 2c. Permission-origin allowlist

`src/main/security/policy/permission-origins.ts` — origins that may be granted camera, microphone,
or notifications.

| Origin | Permissions |
| --- | --- |
| `https://www.facebook.com` | `media` (audio, video), `notifications` |

Separate because it answers a different question — *who may use a device*, not *what may load*. An
origin can be navigable without being trusted with a camera. Spike S-5 may add an RTC iframe origin;
if it does, that origin gains media access **without** gaining navigation rights, which is only
expressible because these are separate lists.

**Hard invariant**: a permission is **never** granted because an origin appears in 2a or 2b. This
file and `navigation-allowlist.ts` may not import each other (ESLint `no-restricted-imports`), and
`evaluatePermission` receives no navigation-allowlist input. The executable statement of this
invariant is a regression test asserting that `https://www.messenger.com` — navigable under redirect
absorption — is **denied** `media`. Matching is on the **normalized** origin: parsed via WHATWG
`URL`, `https:` required, compared as an exact `url.origin` string, with the literal `"null"` origin
(sandboxed iframes) always denied and never admissible to the table. See
[permissions.md](./permissions.md).

**Populated from spike S-5, not from assumption.** AC-S5-4 requires the origin set to be small (≤ 3)
and stable across sessions; if it is unbounded, randomized, or requires the `"null"` origin, S-5's
STOP condition applies and an amendment is required before implementation.

### 2d. External-scheme allowlist

`src/main/security/policy/external-schemes.ts` — schemes that may be handed to macOS.

| Allowed | `https:`, `http:`, `mailto:`, `tel:` |
| --- | --- |
| Blocked outright | `javascript:`, `data:`, `file:`, `blob:`, `about:`, and every custom scheme |

Separate because it guards a different sink: `shell.openExternal` hands a string to the operating
system, and a `file:` or custom-scheme URL reaching it is a local-execution vector. This list is
consulted twice — once in `decide()`, and again immediately before the `openExternal` call in
`external-open.ts`.

---

## 3. Decision algorithm

Evaluated in order; the first failing check decides.

1. **Parse** with the WHATWG `URL` constructor. Failure → `block: 'malformed-url'`.
2. **Userinfo** — `url.username !== '' || url.password !== ''` → `block: 'has-userinfo'`. Checked
   *before* host comparison, because `https://www.facebook.com@evil.example/messages` has host
   `evil.example`.
3. **Scheme** — `https:` continues. `mailto:`/`tel:` → `open-external`. `http:` → `block: 'not-https'`
   if the host would otherwise match 2a or 2b, else `open-external`. Anything not in 2d →
   `block: 'unsafe-scheme'`, never `open-external`.
4. **Host match** — `url.hostname` equals the rule host, or ends with `'.' + ruleHost`. Never
   `includes`, never `endsWith` on the raw string, never a regex over the full URL.
5. **Path match** — `url.pathname === P || url.pathname.startsWith(P + '/')`. A bare
   `startsWith(P)` is **prohibited**: it matches `/messagesomething`. Query and fragment ignored.
6. **No match** → `open-external`.

`decide()` consults 2a, then 2b. The returned decision records which list matched, so a caller can
distinguish a Messenger surface from an authentication surface for logging and for the FR-040
message.

---

## 4. Four enforcement layers

All delegate to `decide()`.

| Layer | API | Scope | On `block` | On `open-external` |
| --- | --- | --- | --- | --- |
| 1 | `setWindowOpenHandler` | popups, `window.open`, `target=_blank` | `{action:'deny'}` | `{action:'deny'}` + `openExternal` |
| 2 | `will-navigate` | renderer-initiated main frame | `preventDefault()` | `preventDefault()` + `openExternal` |
| 3 | `will-redirect` | **every** redirect hop | `preventDefault()` | `preventDefault()` + `openExternal` |
| 4 | `webRequest.onBeforeRequest`, filter `resourceTypes: ['mainFrame']` | browser-initiated main-frame loads | `{cancel:true}` | `{cancel:true}` + `openExternal` |

**Why four**: Electron's navigation throttle emits `will-navigate` only for renderer-initiated,
main-frame navigations; browser-initiated navigations bypass it entirely. `will-redirect` has no such
restriction. Layer 4 nets what layer 2 structurally cannot see. See research R-004.

**Layer 4 must filter `resourceTypes: ['mainFrame']` and nothing else.** Widening it blocks the
subresources FR-010 requires be left alone, breaking page rendering.

**Subframes are out of scope** — the constitution scopes the allowlist to top-level document
navigation. Subframe isolation is Chromium's job. A subframe cannot navigate the top-level document
without passing layer 2 or 3.

---

## 5. Central remote-window factory

`src/main/security/remote-window-factory.ts` is the **only** place in the codebase that constructs a
view or window pointed at remote content, and the only place `webPreferences` is written.

```ts
export function createRemoteWindow(initialUrl: string): BrowserWindow;
export function createRemotePopup(url: string, parent: BrowserWindow): BrowserWindow;
```

**The hardened `webPreferences` baseline is a frozen constant declared inside this same file.** It has
no separate module: the lint rule below forbids the `webPreferences` identifier everywhere else, so a
separate `web-preferences.ts` would violate the very rule it exists to serve. One file, one place.

Each factory call, in one place: applies the frozen hardened `webPreferences`; attaches all four
navigation layers; attaches the permission handlers, device-permission handler, and display-media
handler; attaches the download handler; and binds the `persist:messenger` session.

**Enforcement**: an ESLint `no-restricted-syntax` rule forbids `new BrowserWindow(`,
`new WebContentsView(`, and `new BrowserView(` anywhere outside this file. A second rule forbids the
identifier `webPreferences` outside this file.

**Why this matters**: research R-010 noted that Electron's security here is *maintained by
configuration* — every window created for the rest of the product's life must be created correctly.
A single factory converts that standing obligation into one reviewable function, and the lint rules
convert "remember to use it" into a build failure.

---

## 6. Required assertions

### 6a. Security baseline — `tests/integration/security-baseline.test.ts`

Asserted against the live application for **every** remote window and popup:

| Assertion | Expected |
| --- | --- |
| `sandbox` | `true` |
| `contextIsolation` | `true` |
| `nodeIntegration` | `false` |
| `nodeIntegrationInWorker` | `false` |
| `nodeIntegrationInSubFrames` | `false` |
| `webSecurity` | `true` |
| `allowRunningInsecureContent` | `false` |
| `experimentalFeatures` | `false` |
| `webviewTag` | `false` |
| `preload` | **absent** |
| `session.partition` | `persist:messenger` |
| navigation layers 1–4 | all registered |
| `setPermissionRequestHandler` + `setPermissionCheckHandler` | both registered |
| `setDevicePermissionHandler`, `setDisplayMediaRequestHandler` | registered and denying |

**Failure of this suite is a release blocker regardless of any other result.**

### 6b. Static assertions — lint, run in CI

- no `new BrowserWindow` / `new WebContentsView` / `new BrowserView` outside the factory
- no `webPreferences` identifier outside the factory
- no `preload` key anywhere in the codebase (Option A has zero preloads)
- no `nodeIntegration: true`, `contextIsolation: false`, `sandbox: false`, `webSecurity: false`
  literal anywhere
- no `shell.openExternal` outside `external-open.ts`
- no import of a policy allowlist table outside `policy/index.ts`
- `permission-origins.ts` and `navigation-allowlist.ts` do not import each other — the executable
  guard on the navigability-is-not-device-trust invariant (§2c)

### 6c. Policy unit vectors — `tests/unit/policy/*`

**Allowed in-app**: `/messages`; `/messages/t/1234567890`; `/messenger_media/?attachment_id=1`;
`/login.php?next=%2Fmessages`; `/two_factor/authentication/`; `/two_step_verification/authentication/`;
`https://www.messenger.com/anything`; `https://facebook.com/messages` (apex).

**Routed externally**: `/marketplace`; `/somepage`; `/groups/123`; `/watch`;
`https://l.facebook.com/l.php?u=…`; `https://lm.facebook.com/l.php?u=…`; `https://example.com/article`;
`mailto:…`; `tel:…`.

**The hostile set** — each must fail:

| Input | Expected | Guards against |
| --- | --- | --- |
| `https://facebook.com.evil.example/messages` | `open-external` | suffix confusion |
| `https://evil-facebook.com/messages` | `open-external` | substring confusion |
| `https://www.facebook.com/messagesomething` | `open-external` | **bare `startsWith`** |
| `https://www.facebook.com/messages_evil` | `open-external` | same |
| `https://www.facebook.com@evil.example/messages` | `block: has-userinfo` | userinfo host confusion |
| `https://user:pass@www.facebook.com/messages` | `block: has-userinfo` | credentials in URL |
| `http://www.facebook.com/messages` | `block: not-https` | downgrade |
| `javascript:alert(1)` | `block: unsafe-scheme` | must never reach `openExternal` |
| `data:text/html,…` / `file:///etc/passwd` / `blob:…` / `about:blank` | `block: unsafe-scheme` | same |
| `""` / `"not a url"` / `"//"` | `block: malformed-url` | totality |

**Redirect chain** (integration): `login.php?next=<external>` whose redirect hop targets a
non-allowlisted destination is cancelled **at that hop**, the first hop having been allowed.

**Subresources** (integration): fetches from `fbcdn.net` and `facebook.net` are never cancelled and
never routed externally.

---

## 7. Amendment procedure

Adding a host, path, or permission origin requires: a constitutional amendment, the matching change
to the specific frozen table, and new vectors in both the allowed and hostile sets. A code change
without the amendment fails the review gate.
