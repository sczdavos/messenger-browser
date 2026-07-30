# Phase 0 Research: MessengerBrowser MVP

**Date**: 2026-07-29 | **Feature**: `001-messenger-wrapper-mvp`

All findings verified against current sources on 2026-07-29. Sources listed at the end.

---

## R-001: Electron release line to pin

**Decision**: Pin **Electron 43.2.0** (released 2026-07-21, Chromium 150.0.7871.129, Node 24.18.0).

**Rationale**: Electron supports the latest three stable majors. As of 2026-07-29 those are 41
(EOL 2026-08-25), 42 (EOL 2026-10-20), and 43 (EOL 2027-01-05). Constitution Principle IX and the
dependency policy make an out-of-support Electron a release blocker, so the newest supported line
maximises the runway. Electron 43 is also past the BrowserView removal cliff, so no deprecated view
API is involved.

**Operational consequence**: Electron 43 goes EOL **2027-01-05**. An upgrade must be scheduled before
that date, and the constitution's release gate requires a full compliance re-audit on every Electron
major upgrade. This is a recurring obligation, not a one-time task.

**Alternatives considered**: Electron 41 or 42 (more "settled", but shorter support window and no
security benefit); tracking `latest` unpinned (rejected — the constitution requires pinned
dependencies and a lockfile).

---

## R-002: BrowserWindow alone vs. an application shell with WebContentsView

**Decision**: Use **`BaseWindow` hosting two `WebContentsView` instances** — a local application
shell view and a remote content view.

**Rationale**: The user's instruction was to use a plain sandboxed `BrowserWindow` *unless research
demonstrates a local shell is necessary*. It is necessary, for one specific reason: **FR-025 requires
an in-page Find with match navigation, displayed simultaneously with the remote content.**

- `webContents.findInPage()` provides the search engine but **no user interface**. Electron ships no
  find bar.
- The constitution (Principle VI) prohibits injecting a find bar into the Messenger DOM.
- Therefore the find bar must be application-owned chrome rendered *alongside* the live remote page.
  A single `BrowserWindow` showing only the remote page has nowhere to put it.

The same shell also renders the offline and page-load-error states (FR-036), which would otherwise
have to replace the remote page via `loadFile()` and destroy its navigation history.

This choice also *strengthens* the preload posture rather than weakening it: the only preload script
in the application is attached to the local shell view. The remote content view gets **no preload at
all** (see R-003).

**Layout model**: deterministic, no transparency. The shell view occupies a top strip whose height is
0 when idle and ~44px when the find bar is shown; the content view occupies the remainder. For a
full-window error state the shell view takes the full bounds and the content view is hidden. Bounds
are recomputed on the window `resize` event.

**Alternatives considered**:

- *Plain `BrowserWindow` + `loadFile()` error page, no Find*: simplest, but drops a required
  capability (FR-023/FR-025).
- *Find bar as a separate frameless always-on-top child window*: avoids view composition but must
  manually track parent window movement, focus, and z-order — more fragile, and Principle IX prefers
  maintainable platform APIs over workarounds.
- *`BrowserView`*: deprecated since Electron 30. Not an option on Electron 43.
- *`BrowserWindow` + `contentView.addChildView()`*: workable and nearly equivalent, but the window's
  own `webContents` would sit unused or duplicate the shell view. `BaseWindow` states the intent
  more precisely.

---

## R-003: Preload scripts — can every requirement be met from the main process?

**Decision**: **No preload script is attached to the remote Messenger content.** Exactly one preload
exists, attached only to the local application shell view, exposing a fixed API over `contextBridge`.

**Rationale**: Every MVP requirement was checked against a main-process API. All of them resolve
without touching the remote page:

| Requirement | Main-process mechanism | Preload needed? |
| --- | --- | --- |
| Navigation containment (FR-007–FR-012) | `will-navigate`, `will-redirect`, `setWindowOpenHandler`, `webRequest` | No |
| Permissions (FR-027–FR-031) | `session.setPermissionRequestHandler` / `setPermissionCheckHandler` | No |
| Notifications (FR-055) | Page's own Web Notification API, routed natively once permission is granted | No |
| Dock badge (FR-056) | `page-title-updated` + `app.setBadgeCount` (see R-006) | No |
| Find (FR-025) | `webContents.findInPage` + `found-in-page` | No (shell UI only) |
| Zoom (FR-026) | `webContents.setZoomLevel` | No |
| Downloads (FR-032–FR-035) | `session.on('will-download')` | No |
| Session clearing (FR-017) | `session.clearStorageData` / `clearCache` / `clearAuthCache` | No |
| Menus, lifecycle, shortcuts | `Menu`, `app` events | No |

**Verification**: an automated test asserts that the remote content view's `webPreferences` has no
`preload` and that `nodeIntegration === false`, `contextIsolation === true`, `sandbox === true`.

---

## R-004: Navigation interception — the layered enforcement finding

**Decision**: Enforce the allowlist at **four** layers, not one.

**Rationale — this is the most important finding of Phase 0.** Electron's navigation throttle source
shows that `will-navigate` is **not** a universal interception point:

> `will-navigate` only fires for **renderer-initiated, main-frame** navigations. Browser-initiated
> navigations bypass it entirely. Subframe navigations surface only on `will-frame-navigate` (also
> renderer-initiated only). `will-redirect` has no such restriction and fires on all redirects.

An allowlist implemented solely on `will-navigate` — the pattern in most tutorials and in Electron's
own security guide — therefore has gaps. The design uses:

| Layer | API | Catches |
| --- | --- | --- |
| 1 | `setWindowOpenHandler` | `window.open`, `target="_blank"`, popups |
| 2 | `will-navigate` | renderer-initiated main-frame navigation |
| 3 | `will-redirect` | **every** redirect hop, regardless of initiator |
| 4 | `session.webRequest.onBeforeRequest` with filter `{ urls: ['<all_urls>'], types: ['mainFrame'] }` | backstop for browser-initiated main-frame loads that layer 2 misses |

Layer 3 is what satisfies the constitution's per-hop rule and closes the `login.php?next=` bypass.
Layer 4 is the belt-and-braces net for the gap the source code documents.

**Subframes are deliberately not subject to the top-level allowlist.** The constitution scopes the
allowlist to top-level document navigation, and blocking subframes would break embedded content the
site legitimately uses. Subframe isolation is left to Chromium (`webSecurity: true`, site isolation).
A subframe cannot navigate the top-level document without passing layer 2 or 3.

**Critical implementation constraint**: the `WebRequestFilter` structure has exactly three fields —
`urls` (**required**), `excludeUrls`, and **`types`**. The resource-type key is `types`, *not*
`resourceTypes`, and `urls` cannot be omitted. Electron silently ignores an unrecognized filter key,
so writing `resourceTypes` causes the listener to fire for every request; `decide()` then routes
every `fbcdn.net` asset to `open-external`, cancelling it and spawning the default browser once per
subresource. The listener MUST also check `details.resourceType === 'mainFrame'` as its first
statement, as defence in depth. Filtering more broadly blocks the subresources FR-010 requires be
left alone.

---

## R-005: Permission handling — the second handler is not optional

**Decision**: Implement **both** `setPermissionRequestHandler` **and** `setPermissionCheckHandler`,
and key decisions off `requestingOrigin`, not `webContents.getURL()`.

**Rationale**: Two findings from the Electron session documentation:

1. *"To ensure complete permission handling, you must implement both `setPermissionRequestHandler`
   and `setPermissionCheckHandler`, because most web APIs perform a permission check first and only
   make a permission request if that check is denied."* Implementing only the request handler leaves
   the check path at its default, which is **not** deny-all. FR-027 and FR-031 would silently fail.

2. In `setPermissionCheckHandler`, *"Cross-origin subframes and certain checks like `notifications`
   will pass `null`"* for `webContents`. Electron's own documented example calls
   `webContents.getURL()`, which throws or misjudges in exactly those cases. The handler must use the
   `requestingOrigin` argument.

**Decision matrix** (identical in both handlers):

| Permission | Decision |
| --- | --- |
| `media` with `mediaType` `audio` or `video`, origin `https://www.facebook.com` | Allow |
| `notifications`, origin `https://www.facebook.com` | Allow |
| Everything else, including `media` from any other origin | Deny |

Everything else explicitly includes `geolocation`, `midi`, `midiSysex`, `hid`, `serial`, `usb`,
`clipboard-read`, `deprecated-sync-clipboard-read`, `idle-detection`, `pointerLock`, `fullscreen`,
`openExternal`, `fileSystem`, `storage-access`, `top-level-storage-access`, `mediaKeySystem`, and any
permission string not recognised by the matrix — the default branch denies, so future Chromium
permission types are denied without a code change (FR-031).

**Additionally**: `session.setDevicePermissionHandler` returns `false` for all devices, and
`session.setDisplayMediaRequestHandler` denies screen capture (out of scope; also avoids the
`NSAudioCaptureUsageDescription` requirement introduced for macOS 14.2+).

**macOS layer**: the web-layer grant is necessary but not sufficient. `systemPreferences` reports and
requests the OS-level TCC grant, and `Info.plist` must carry `NSCameraUsageDescription` and
`NSMicrophoneUsageDescription` or the system prompt never appears. If TCC access was previously
denied, macOS will not re-prompt — the app must direct the user to System Settings (FR-030).

---

## R-006: Unread badge without DOM injection

**Decision**: Derive the badge from the **document title** via `page-title-updated`, and call
`app.setBadgeCount()`. Degrade to no badge when the pattern is absent.

**Rationale**: The spec flagged FR-056 as at risk because deriving an unread count normally means
scraping the DOM, which Principle VI forbids. The document title is a different thing: it is a
standard, stable web surface exposed by a first-class Electron event, not internal DOM structure.
Messenger renders unread state as a leading `(N)` in the title.

**This is still a coupling to the site's behaviour** and is recorded as a justified deviation in the
plan's Complexity Tracking. It is bounded: a single regex, in one module, with a documented failure
mode of "no badge" rather than a broken application. Notifications (FR-055) are unaffected because
they come from the page's own Notification API.

**Alternatives considered**: reading the DOM for an unread element (violates Principle VI); Meta's
API (violates Principle I and FR-049); no badge at all (loses FR-056, which the user approved).

---

## R-007: Window close must hide, not destroy

**Decision**: Intercept the window `close` event, `preventDefault()`, and `hide()` the window. Real
termination is gated on an `isQuitting` flag set in `before-quit`.

**Rationale**: FR-058 requires the application to keep delivering notifications after the window is
closed. Notifications originate from the page's own Notification API, which only runs while the
remote `webContents` is alive. Destroying the window destroys that `webContents`, so a literal
"close" would silently kill the very capability FR-055 requires.

Consequences: `window-all-closed` never fires in normal use, so the usual macOS quit guard is
irrelevant; `app.on('activate')` and the single-instance `second-instance` handler both call
`show()`; and FR-059's "reopen with existing session and saved geometry, no re-authentication" is
satisfied trivially because the page was never torn down.

**Risk carried**: FR-057 (activating a notification brings the app forward) relies on macOS
activating the application on notification click, surfacing as `app.on('activate')`, combined with
the page's own `window.focus()`. There is no Electron hook for a click on a page-originated
notification. Intercepting the notification to add one would require reading its content, which
FR-055 forbids. This must be verified empirically during implementation; if it fails, the fallback is
to accept that the notification opens the app but not a specific conversation.

---

## R-008: Signing and notarization toolchain

**Decision**: Electron Forge 7 with `@electron/osx-sign` and `@electron/notarize` via
`packagerConfig.osxSign` / `osxNotarize` using `tool: 'notarytool'` and a **Keychain profile**.
Maker: `@electron-forge/maker-dmg`. Hardened Runtime on.

**Rationale**: `altool --notarize-app` was removed from `xcrun` on 2023-11-01; `notarytool` is the
only supported path. Storing credentials via `notarytool store-credentials` and passing
`--keychain-profile` keeps the app-specific password out of environment variables and build logs,
which is preferable to the `appleId` / `appleIdPassword` form shown in most examples.

**Entitlements** — minimum set, matching constitution Principle XIV:

```xml
com.apple.security.cs.allow-jit            <!-- required for V8 -->
com.apple.security.device.camera           <!-- FR-028 -->
com.apple.security.device.audio-input      <!-- FR-028 -->
```

Explicitly **not** included: `com.apple.security.cs.allow-unsigned-executable-memory`,
`com.apple.security.cs.disable-library-validation`,
`com.apple.security.cs.allow-dyld-environment-variables`. Current Electron requires only `allow-jit`;
the older, broader entitlements are cargo-culted from Electron versions long past and each one
measurably weakens the Hardened Runtime.

**Info.plist**: `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`. Not
`NSAudioCaptureUsageDescription` — screen/system audio capture is denied (R-005).

**Architecture**: `arm64` only, per FR-051. No universal build.

---

## R-009: Test strategy

**Decision**: **Vitest** for pure logic, **Playwright `_electron`** for application behaviour, with an
explicit manual list for what neither can reach.

**Rationale**: The highest-value tests are pure functions — the allowlist decision function carries
almost all of the product's security weight and is trivially unit-testable, including every hostile
case the constitution enumerates. Vitest runs those in milliseconds with no Electron process.

Playwright's Electron support is experimental but is the standard choice, driving Electron over the
Chrome DevTools Protocol. It covers window creation, menu-driven behaviour, navigation outcomes, and
web-preferences assertions.

**Documented limitation**: Playwright **cannot intercept native Electron dialogs** —
`dialog.showSaveDialog`, `showMessageBox`, and the download save panel run in the main process and go
straight to OS APIs. Consequently FR-032/FR-033 (save panel appears, cancel writes nothing) and the
Clear Session Data confirmation dialog are verified by a manual checklist, with the surrounding logic
unit-tested by injecting a dialog seam.

---

## R-010: Rejected platform alternatives

### Tauri (WKWebView)

**Rejected**, but it is the strongest alternative and the trade-off is real.

*In favour*: a fraction of the bundle size, no bundled Chromium, no Node runtime in the process at
all — which would satisfy constitution Principle II structurally rather than by configuration.

*Against, decisive*: the MVP requires working voice and video calls (User Story 6, SC-010) and
notifications. `getUserMedia` in a host-embedded WKWebView requires the host to implement the media
capture permission delegate and carries meaningfully different behaviour from Safari proper, and
Meta's RTC stack is developed and tested against Chromium and Safari as *browsers*, not as embedded
web views. Web Notifications in WKWebView need host bridging. The risk is not that these are
impossible; it is that each is an open-ended compatibility investigation against a site we do not
control and cannot instrument (Principle VI forbids injecting probes). That is an unbounded schedule
risk for a first release the constitution explicitly requires to be small.

### Native Swift + WKWebView

**Rejected**, with the same caveat.

*In favour*: the smallest and most native result, no Node, no Chromium, trivially satisfied Principle
II, and AppKit makes menus, lifecycle, and window-state persistence straightforward.

*Against*: identical WKWebView compatibility risk for calls and notifications, plus the user has
specified the Electron/TypeScript/Forge stack. Recording this honestly: a native implementation would
have a structurally stronger security posture, because Electron's safety here is *maintained by
configuration* — every future window and view must be created correctly, forever. That is precisely
why the plan makes the security baseline a tested invariant rather than a convention.

### Electron with `webview` tag

**Rejected**. Electron's own security guidance discourages it; it has a distinct and historically
weaker security surface than `WebContentsView`, and it offers nothing this design needs.

---

## R-011: Find reassessment — does it justify the shell architecture?

**Decision**: **No. Recommend removing Find from the MVP** and adopting a single-window architecture
with **zero preload scripts and zero IPC channels**.

**Rationale**: R-002 concluded that Find forces application-owned chrome, which forces `BaseWindow` +
two `WebContentsView`s + a preload + an IPC surface. Re-examining the premise, two things are true:

**1. The other chrome requirements do not need a persistent shell view.**

| Requirement | Without a shell view |
| --- | --- |
| FR-036 offline / load-failure screen | `loadFile()` a local error page into the window. The failed navigation already destroyed the document, so nothing is lost |
| Retry from that screen | A plain `<a href="https://www.facebook.com/messages">` link — the allowlist permits it, so the navigation itself is the retry. **No preload, no IPC** |
| FR-040 blocked-navigation message | Native `dialog.showMessageBox` — non-destructive, leaves the session page intact |
| FR-030 permission-denied guidance | Native `dialog.showMessageBox` with an "Open Settings" button |

Find is the *only* requirement needing chrome composited over a live page.

**2. Find delivers little value on this particular site.** `findInPage()` searches the rendered DOM.
Messenger is a virtualised-list single-page application: messages outside the viewport are not in the
DOM, so a browser find matches only what is currently scrolled into view. It cannot search a
conversation, which is what a user pressing ⌘F actually wants. Messenger ships its own message and
conversation search, which does work over the full history. Browser find here is close to a decoy
feature — it appears to work and silently misses almost everything.

**What removing it buys**, concretely:

| | With Find (Option B) | Without Find (Option A) |
| --- | --- | --- |
| Window model | `BaseWindow` + 2 `WebContentsView` | one `BrowserWindow` |
| Preload scripts | 1 (local shell) | **0** |
| IPC channels | 7 | **0** |
| `contextBridge` surface | 7 members | **none** |
| Layout code | manual bounds math on every resize | none |
| Modules | ~20 | ~15 |
| Contracts to review | 4 | 3 |

The removed code is disproportionately security-sensitive: preload plus IPC is precisely the surface
Principle II exists to constrain. An application with no preload and no IPC cannot have an IPC
vulnerability, cannot leak a bridge to remote content, and cannot regress if someone later adds a
channel carelessly — there is no channel file to add to. Sender-verification bugs, payload-validation
bugs, and `contextBridge` mistakes all become unreachable by construction rather than prevented by
review.

This also aligns with Principle VIII (keep the first release small) and the user's original
instruction to prefer a plain sandboxed `BrowserWindow` unless research proved otherwise. The
research now points the other way.

**Cost**: users lose ⌘F. Given point 2, what they lose is a feature that would have searched only the
visible portion of a conversation.

**Recommendation**: adopt Option A. This requires a spec amendment removing Find from FR-023 and
deleting FR-025. Option B is retained in the plan as a documented fallback if Find is later judged
essential, and the shell design does not change if it is revived.

---

## Sources

- [Electron Releases](https://releases.electronjs.org/) — 43.2.0 current stable, 2026-07-21
- [Electron release schedule](https://releases.electronjs.org/schedule) — support windows and EOL dates
- [endoflife.date: Electron](https://endoflife.date/electron) — supported majors 41/42/43
- [Migrating from BrowserView to WebContentsView](https://www.electronjs.org/blog/migrate-to-webcontentsview) — BrowserView deprecated since Electron 30
- [Electron `session` API](https://github.com/electron/electron/blob/main/docs/api/session.md) — permission request/check handlers, permission type list, `requestingOrigin` semantics
- [Electron security tutorial](https://github.com/electron/electron/blob/main/docs/tutorial/security.md) — navigation and window-open patterns
- [`electron_navigation_throttle.cc`](https://github.com/electron/electron/blob/main/shell/browser/electron_navigation_throttle.cc) — `will-navigate` renderer-initiated/main-frame restriction
- [Electron `web-contents` API](https://github.com/electron/electron/blob/main/docs/api/web-contents.md) — `will-navigate`, `will-frame-navigate`, `will-redirect` signatures
- [Electron `systemPreferences` API](https://github.com/electron/electron/blob/main/docs/api/system-preferences.md) — `askForMediaAccess`, Info.plist requirements
- [Signing a macOS app — Electron Forge](https://www.electronforge.io/guides/code-signing/code-signing-macos)
- [Publishing Desktop Apps on macOS in 2026](https://www.forasoft.com/blog/article/the-pain-of-publishing-electron-apps-on-macos-303) — notarytool-only, `allow-jit` only, keychain profile guidance
- [Playwright Electron class](https://playwright.dev/docs/api/class-electron) and [Electron automated testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing) — `_electron`, native dialog limitation
