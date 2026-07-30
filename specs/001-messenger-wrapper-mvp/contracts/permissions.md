# Contract: Permissions

**Module**: `src/main/security/permissions.ts`

Implements FR-027 through FR-031. Deny by default, with exactly three grants.

---

## Both handlers are mandatory

Electron's session documentation states: *"To ensure complete permission handling, you must implement
both `setPermissionRequestHandler` and `setPermissionCheckHandler`, because most web APIs perform a
permission check first and only make a permission request if that check is denied."*

Implementing only the request handler leaves the check path at its default, which is **not**
deny-all. FR-027 and FR-031 would silently fail while appearing correct in review.

Both handlers delegate to the same pure function:

```ts
export function evaluatePermission(q: PermissionQuery): PermissionDecision;
```

---

## ⚠️ The two handlers have DIFFERENT signatures — do not assume symmetry

This is the single most error-prone part of this contract. The handlers are **not** parallel, and a
naive shared implementation silently misbehaves.

| | `setPermissionCheckHandler` | `setPermissionRequestHandler` |
| --- | --- | --- |
| Signature | `(webContents, permission, requestingOrigin, details)` | `(webContents, permission, callback, details)` |
| `requestingOrigin` | **present as a parameter** | **absent — does not exist** |
| `webContents` | may be `null` (cross-origin subframes, `notifications`) | non-null |
| Media type field | `details.mediaType` — **singular string** (`'audio'`/`'video'`/`'unknown'`) | `details.mediaTypes` — **array** (`['audio','video']`) |
| `details` type | one object shape | a union: `PermissionRequest`, `MediaAccessPermissionRequest`, `FilesystemPermissionRequest`, `OpenExternalPermissionRequest` |

Two consequences that will otherwise produce silent failures:

1. **Reading `details.mediaType` in the request handler yields `undefined`.** Under the decision
   matrix below, an absent media type denies. The result is that **every camera and microphone
   request is silently denied and calls fail with no error** — the same failure signature spike S-5
   exists to catch, arriving from a second direction. The request handler MUST read `mediaTypes` and
   treat the request as granted only if every element is `audio` or `video`.
2. **There is no `requestingOrigin` to key off in the request handler.** It must be derived — see
   below. Falling back to `webContents.getURL()` there would decide on the **top-level page's**
   origin rather than the actual requesting frame, granting a cross-origin RTC iframe access it was
   never listed for. That is precisely the bypass the permission-origin allowlist exists to prevent.

## Origin derivation

Decisions key off a **normalized origin** in both handlers. How that origin is obtained differs.

**Check handler** — use the `requestingOrigin` parameter directly. Do **not** call
`webContents.getURL()`; `webContents` is `null` in exactly the cases that matter, and Electron's own
documented example gets this wrong.

**Request handler** — derive, in this strict precedence, stopping at the first that yields a value:

1. `details.securityOrigin` — present on `MediaAccessPermissionRequest`; authoritative for `media`.
2. The origin of `details.requestingUrl` — the last URL the requesting frame loaded, parsed via
   WHATWG `URL` and reduced to `url.origin`.
3. **Deny.** There is no third fallback. If neither field is present, the request is denied and the
   event is logged with `permission`, `isMainFrame`, and which fields were absent.

`webContents.getURL()` MUST NOT appear in either handler. `webContents` may be used for logging
context only, never for the decision, and must be null-checked at every use.

The derived value is then passed through `normalizeOrigin` and compared against the
permission-origin allowlist. Both handlers converge on the same pure `evaluatePermission` after
derivation — the derivation itself is the part that must not be shared.

### Normalization

```ts
function normalizeOrigin(raw: string): string | null;
```

Pure and total. Returns `null` — meaning deny — unless all of the following hold:

1. `raw` parses via the WHATWG `URL`.
2. `url.protocol === 'https:'`.
3. The result is `url.origin`, compared as an **exact string**, never a prefix, suffix, or substring
   test.

**The literal `"null"` origin is denied.** Sandboxed and opaque-origin iframes report `"null"`; it
must never be normalized into a value that can match a table entry, and it must never be added to the
allowlist. Treat it as a distinct deny case, not as a parse failure, so it is visible in logs.

Any input that is empty, malformed, non-`https`, or `"null"` returns `null` and the permission is
denied.

## Permission grants are never derived from navigability

**An origin MUST NOT receive a permission because it appears in the top-level navigation allowlist.**
Being loadable and being trusted with a camera are independent properties.

Enforcement:

- `policy/permission-origins.ts` and `policy/navigation-allowlist.ts` are separate files, and
  **neither may import the other**. An ESLint `no-restricted-imports` rule enforces this.
- `evaluatePermission` takes no navigation-allowlist input and has no access to it.
- A required regression test asserts that `https://www.messenger.com` — which *is* navigable under
  redirect absorption — is **denied** `media`. This test is the executable statement of the
  separation; if it ever passes trivially because the tables were merged, the merge has broken the
  invariant.

---

## Decision matrix

Approved origins come from the **permission-origin allowlist**,
`src/main/security/policy/permission-origins.ts` — a table separate from the navigation and
authentication allowlists (see [navigation-policy.md](./navigation-policy.md) §2c). An origin being
navigable does not make it trusted with a camera, and the separation is what lets spike S-5 add an
RTC iframe origin for `media` **without** granting it navigation rights.

Current contents: `https://www.facebook.com` (exact origin string, not a substring test).

**Spike dependency**: S-5 must confirm this is the only origin that requests `media`. If Meta's RTC
stack runs in a cross-origin iframe, the request arrives from a different origin with
`webContents === null`, and a handler keyed only to `www.facebook.com` denies it — calls fail with no
obvious cause. Do not implement against the assumption that one origin suffices; implement against
the table, and populate the table from S-5.

Media type is read from a **different field in each handler** (see the signature table above):
`details.mediaType` (singular) in the check handler, `details.mediaTypes` (array) in the request
handler. Both are normalized to a set before matching.

| Permission | Media types requested | Origin | Decision |
| --- | --- | --- | --- |
| `media` | `audio` only | approved | **grant** |
| `media` | `video` only | approved | **grant** |
| `media` | both `audio` and `video` | approved | **grant** |
| `media` | includes `unknown`, or empty, or absent | approved | deny |
| `media` | any | any other origin | deny |
| `notifications` | — | approved | **grant** |
| `notifications` | — | any other origin | deny |
| anything else | — | any origin | deny |

A `media` request grants only if the requested set is non-empty **and every element** is `audio` or
`video`. A single unrecognized element denies the whole request — the request handler's `mediaTypes`
is an array, so partial grants are not expressible through the callback and must not be faked.

"Anything else" explicitly includes `geolocation`, `midi`, `midiSysex`, `hid`, `serial`, `usb`,
`clipboard-read`, `clipboard-sanitized-write`, `deprecated-sync-clipboard-read`, `idle-detection`,
`pointerLock`, `fullscreen`, `openExternal`, `fileSystem`, `storage-access`,
`top-level-storage-access`, and `mediaKeySystem`.

**The default branch denies.** The permission string is treated as untrusted input, so a permission
type introduced by a future Chromium version is denied without any code change (FR-031). There must
be no `default: return true` and no permission-string allowlist built by exclusion.

---

## Additional handlers

| Handler | Setting | Reason |
| --- | --- | --- |
| `session.setDevicePermissionHandler` | return `false` for all | denies HID/serial/USB device selection |
| `session.setDisplayMediaRequestHandler` | deny | screen capture is out of scope; also avoids the `NSAudioCaptureUsageDescription` requirement on macOS 14.2+ |
| `session.setBluetoothPairingHandler` | not registered | with no listener, Electron cancels all Bluetooth requests |

---

## macOS TCC layer

The web-layer grant is necessary but not sufficient. Camera and microphone also require the OS grant.

- `Info.plist` must carry `NSCameraUsageDescription` and `NSMicrophoneUsageDescription`, or the
  system prompt never appears.
- Entitlements must carry `com.apple.security.device.camera` and
  `com.apple.security.device.audio-input`.
- `systemPreferences.getMediaAccessStatus('camera' | 'microphone')` reports current status;
  `askForMediaAccess` requests it.
- **If access was previously denied, macOS will not re-prompt.** The promise resolves with the
  existing status and no dialog appears. FR-030 requires the application to detect this and route the
  user to System Settings rather than appearing to hang.
- A TCC grant change requires an application restart to take effect. The message shown to the user
  must say so.

---

## Required tests

**Unit** (`evaluatePermission` and `normalizeOrigin`, both pure):

- every permission string in the matrix, at the approved origin and at `https://evil.example`
- `media` with each of `audio`, `video`, `unknown`, and `undefined`
- an invented permission string such as `'future-permission-2027'` → denied
- origin near-misses: `https://facebook.com.evil.example`, `http://www.facebook.com`,
  `https://www.facebook.com.evil.example` → denied
- `requestingOrigin` of `''`, `'null'`, and a malformed string → denied, no throw
- **request-handler origin derivation** (its own test file): `details.securityOrigin` present →
  used; absent but `details.requestingUrl` present → origin derived from it; both absent → denied
  and logged; `webContents.getURL()` never consulted
- **`mediaTypes` array handling**: `['audio']`, `['video']`, `['audio','video']` at an approved
  origin → granted; `[]`, `['unknown']`, `['audio','unknown']`, and `undefined` → denied
- **cross-handler equivalence**: the same logical request expressed as check-handler
  (`mediaType: 'video'`) and request-handler (`mediaTypes: ['video']`) inputs yields the identical
  decision — the regression guard against the two paths drifting apart
- **separation invariant**: `https://www.messenger.com` (navigable under redirect absorption) is
  denied `media` and `notifications` unless it is independently present in the permission-origin
  table
- origin with a non-default port and with a trailing slash → normalized consistently, matched exactly

**Integration**:

- the check handler is invoked with `webContents === null` and still decides correctly
- both handlers are registered on the `persist:messenger` session at startup

**Manual**:

- first call triggers the macOS camera and microphone prompts
- with TCC access denied in System Settings, a call attempt produces the FR-030 explanation and the
  Settings route, not a hang
