---

description: "Task list for MessengerBrowser MVP"
---

# Tasks: MessengerBrowser MVP

**Input**: Design documents from `/specs/001-messenger-wrapper-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, spike.md

**Tests**: Test tasks ARE included. Automated tests are mandatory here, not optional — Constitution
Principle IX requires automated tests over workarounds, Principle XII requires explicit acceptance
criteria per capability, and plan M-4 makes the security assertion suite a release blocker.

**Organization**: Tasks are grouped by user story. Architecture is **Option A** — one
`BrowserWindow`, zero preload scripts, zero IPC channels (research R-011).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US10)
- Include exact file paths in descriptions

## Path Conventions

Single project at repository root: `src/main/`, `src/renderer-static/`, `tests/`, `build/`.

> **Phase ordering deviates from the template**: a blocking feasibility spike precedes Setup. This is
> deliberate — see plan.md "Phase 0 Gate". Production implementation MUST NOT begin until Phase 0
> records a GO or GO-WITH-AMENDMENTS decision.

---

## Phase 0: Feasibility Spike (BLOCKING GATE) 🚧

**Purpose**: Verify the three unobserved assumptions the entire plan rests on. See
[spike.md](./spike.md).

**⚠️ NO PRODUCTION CODE MAY BE WRITTEN UNTIL THIS PHASE RECORDS A DECISION.** Everything in `spike/`
is throwaway and is deleted, never merged. Spike code MUST NOT disable a security control to obtain
an answer — if a question is only answerable with `sandbox: false`, "not viable under the
constitution" is itself the finding.

- [X] T001 Scaffold throwaway spike app in `spike/` with Electron 43.2.0, hardened `webPreferences` (sandbox, contextIsolation, no preload), loading `https://www.facebook.com/messages`
- [X] T002 Add navigation logging to `spike/instrument/navigation-log.ts` recording every `will-navigate`, `will-frame-navigate`, `will-redirect`, `setWindowOpenHandler`, and `webRequest.onBeforeRequest` mainFrame event with full URL path
- [X] T003 Run S-1 normal login; record every main-frame path visited in `spike.md` §S-1 Findings
- [ ] T004 Run S-2 auth challenge flows (authenticator 2FA, SMS 2FA, trust-device interstitial, new-device checkpoint, password recovery entry); record complete required path set in `spike.md` §S-2 Findings
- [X] T005 Run S-3 outgoing voice and video calls; record call surface URLs, whether in-page/popup/navigation, and origin in `spike.md` §S-3 Findings
- [X] T006 Run S-4 incoming calls with window hidden and with window visible-unfocused; record ring/notification/answerability in `spike.md` §S-4 Findings
- [X] T007 Build S-5 permission instrumentation in `spike/instrument/permission-log.ts` capturing all 11 mandatory fields (permission, raw + normalized requestingOrigin, securityOrigin, embeddingOrigin, requestingUrl, mediaType, isMainFrame, frame identity, `webContents === null`, which handler, check→request ordering) for every `media` and `notifications` check AND request
- [X] T008 Run S-5 across outgoing voice, outgoing video, and answered incoming call — twice each plus once on a fresh session; validate AC-S5-1 … AC-S5-7 and record the origin table in `spike.md` §S-5 Findings. Notification-origin work is deferred with the notification-and-badge capability.
- [ ] T009 Build S-6 harness in `spike/instrument/reliability-harness.ts` driving the 6 window states (visible-focused, visible-inactive, minimized, fully occluded, hidden, ≥2h idle) and sampling renderer/main CPU, RSS, and energy impact
- [ ] T010 Run S-6 full 6×2 matrix (default throttling, then `backgroundThrottling: false`), escalating the configuration ladder only as needed; verify **actual message arrival** and resource cost; validate the non-deferred AC-S6 criteria and record the lowest sufficient rung in `spike.md` §S-6 Findings. Notification delivery is deferred with the notification-and-badge capability.
- [X] T011 Run S-7 notification click-to-focus with window hidden; record whether `app.on('activate')` fires and whether the correct conversation opens, in `spike.md` §S-7 Findings
- [X] T011a Run S-9 title observation — log the raw `page-title-updated` string at 0, 1, 2, 3, and 5+ unread and after reading all, plus once after a reload; record verbatim in `spike.md` §S-9 Findings. **Observation only**: no parsing for production use, no DOM access, no badge implementation
- [ ] T012 Complete S-8 checklist in `spike.md`; record GO / GO-WITH-AMENDMENTS / NO-GO decision and list every required constitution or spec amendment
- [ ] T013 If S-5 or S-6 hit a STOP condition, halt and draft the specific amendment via `/speckit-constitution` or a spec update — do NOT widen an allowlist or relax a control to make the spike pass
- [ ] T014 Merge all amendments arising from T012/T013 into `.specify/memory/constitution.md` and `spec.md` before proceeding
- [X] T015 Delete `spike/` entirely; confirm no spike code reaches `src/`

**🚧 GATE CHECKPOINT**: Phase 0 decision recorded and amendments merged. Only now may Phase 1 begin.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization. No application behaviour yet.

- [X] T016 Initialize npm project at repository root with `package.json`, pinning `electron@43.2.0` exactly (no caret), setting `productName` to `MessengerBrowser` and a bundle identifier derived from it (FR-041), and committing `package-lock.json`
- [X] T017 [P] Create `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, and a `typecheck` script that fails the build on any error
- [X] T018 [P] Configure ESLint in `eslint.config.js` and Prettier in `.prettierrc` with a `lint` script
- [X] T019 Add ESLint security rules to `eslint.config.js`: `no-restricted-syntax` forbidding `new BrowserWindow(`, `new WebContentsView(`, `new BrowserView(` and the `webPreferences` identifier outside `src/main/security/remote-window-factory.ts` **and `tests/**`** (the test carve-out is required — without it this rule contradicts the T046 security-baseline suite); forbidding any `preload` key anywhere; forbidding `shell.openExternal` outside `src/main/security/external-open.ts`; forbidding `getLastWebPreferences` anywhere (undocumented API, Principle IX); forbidding literals `nodeIntegration: true`, `contextIsolation: false`, `sandbox: false`, `webSecurity: false`
- [X] T020 Add ESLint `no-restricted-imports` rules enforcing that `src/main/security/policy/*` tables are imported only by `src/main/security/policy/index.ts` and its tests, and that `permission-origins.ts` and `navigation-allowlist.ts` never import each other
- [X] T021 [P] Create `vitest.config.ts` for unit tests under `tests/unit/`
- [X] T022 [P] Create `playwright.config.ts` for Electron integration tests under `tests/integration/`
- [X] T023 [P] Create `.gitignore` at repository root covering `node_modules/`, `out/`, `dist/`, `.vite/`, and `.DS_Store`
- [X] T024 Create the source directory skeleton `src/main/{window,security/policy,session,features}`, `src/renderer-static/`, `tests/{unit/policy,integration}`, `build/`
- [X] T025 Create `forge.config.ts` skeleton with `@electron-forge/plugin-vite`, arm64-only packaging, `@electron-forge/maker-dmg`, `productName: 'MessengerBrowser'` (FR-041), and `LSMinimumSystemVersion` in the Info.plist configuration set to the macOS floor from FR-051 so the app cannot install on an unsupported release

**Checkpoint**: `npm run typecheck` and `npm run lint` pass on an empty project.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The security core. Every user story depends on a hardened window existing and on the
navigation and permission policy being enforced.

**⚠️ CRITICAL**: No user story work may begin until this phase is complete and T045/T046 pass.

### Policy layer — pure, no Electron imports

- [X] T026 [P] Create top-level navigation allowlist table in `src/main/security/policy/navigation-allowlist.ts` as a frozen constant (facebook.com `/messages`, `/messenger_media`; messenger.com any — redirect absorption only), populated per contracts/navigation-policy.md §2a
- [X] T027 [P] Create authentication allowlist table in `src/main/security/policy/auth-allowlist.ts` (facebook.com `/login.php`, `/two_step_verification`, `/two_factor`, plus any paths added by spike S-2), per §2b
- [X] T028 [P] Create the permission-origin allowlist **module, types, and lookup** in `src/main/security/policy/permission-origins.ts` mapping the Phase 0-confirmed Facebook origin to media access; notifications remain deferred. Splitting authorship this way keeps a single owner for the table's contents
- [X] T029 [P] Create external-scheme allowlist in `src/main/security/policy/external-schemes.ts` (`https:`, `http:`, `mailto:`, `tel:`), per §2d
- [X] T030 Implement the canonical `decide(rawUrl): NavigationDecision` in `src/main/security/policy/index.ts` — total, pure, no throw; parse → userinfo check → scheme → host exact-or-subdomain → whole-segment path match (`pathname === P || pathname.startsWith(P + '/')`), per §3
- [X] T031 Implement `normalizeOrigin(raw): string | null` in `src/main/security/policy/normalize-origin.ts` — WHATWG parse, require `https:`, return exact `url.origin`, deny the literal `"null"` origin as a distinct visible case
- [X] T032 Implement `evaluatePermission(query): PermissionDecision` in `src/main/security/permissions-policy.ts` keyed on the normalized `requestingOrigin`, with a default-deny branch so unknown future permission strings are denied without a code change; it takes NO navigation-allowlist input

### Policy tests — write before wiring

- [X] T033 [P] Write `tests/unit/policy/allowlist.test.ts` covering every allowed vector, every externally-routed vector, and the full hostile set from contracts/navigation-policy.md §6c — including `/messagesomething`, `facebook.com.evil.example`, `www.facebook.com@evil.example`, `http://` downgrade, `javascript:`/`data:`/`file:`/`blob:`/`about:`, and malformed input totality
- [X] T034 [P] Write `tests/unit/policy/normalize-origin.test.ts` covering `''`, `'null'`, malformed strings, non-https, trailing slash, and non-default port
- [X] T035 [P] Write `tests/unit/policy/permissions.test.ts` covering the full decision matrix at approved and hostile origins, `media` with audio/video/unknown/undefined, an invented permission string, and the **separation invariant**: `https://www.messenger.com` is navigable but MUST be denied `media`
- [X] T036 [P] Write `tests/unit/policy/external-schemes.test.ts` asserting only `https`/`http`/`mailto`/`tel` are externally openable and every other scheme is blocked, never forwarded

### Electron wiring

- [X] T037 Define the hardened `webPreferences` baseline as a frozen constant **inside `src/main/security/remote-window-factory.ts`** (sandbox, contextIsolation, webSecurity true; nodeIntegration, nodeIntegrationInWorker, nodeIntegrationInSubFrames, allowRunningInsecureContent, experimentalFeatures, webviewTag false; no preload key) — it must NOT live in a separate module, because T019's lint rule forbids the `webPreferences` identifier anywhere outside the factory
- [X] T038 Create the persistent session in `src/main/session/partition.ts` using `session.fromPartition('persist:messenger')`
- [X] T039 Implement `src/main/security/external-open.ts` — the only caller of `shell.openExternal`, re-validating the scheme against the external-scheme allowlist immediately before the call
- [X] T040 Implement the four navigation enforcement layers in `src/main/security/navigation.ts` — `setWindowOpenHandler`, `will-navigate`, `will-redirect`, and `webRequest.onBeforeRequest` registered with the filter `{ urls: ['<all_urls>'], types: ['mainFrame'] }` (the key is `types`, NOT `resourceTypes`, and `urls` is required — an unrecognized key is silently ignored and the listener then fires for every subresource) plus a first-statement `details.resourceType === 'mainFrame'` guard returning `{cancel:false}` for anything else — all delegating to `decide()`, none matching URLs inline
- [X] T041 Implement `src/main/security/permissions.ts` registering BOTH `setPermissionRequestHandler` and `setPermissionCheckHandler`, plus `setDevicePermissionHandler` denying all and `setDisplayMediaRequestHandler` denying screen capture. **The two handlers have different signatures — do not share a derivation path**: the check handler receives `requestingOrigin` as a parameter and reads `details.mediaType` (singular); the request handler has **no** `requestingOrigin` and reads `details.mediaTypes` (**array**). Derive the request handler's origin as `details.securityOrigin` → origin of `details.requestingUrl` → deny. `webContents.getURL()` must appear in neither. See contracts/permissions.md
- [X] T041a Implement request-handler origin derivation and `mediaTypes` array handling in `src/main/security/permissions-policy.ts`, granting `media` only when the requested set is non-empty and every element is `audio` or `video`
- [X] T042 Implement the central factory `src/main/security/remote-window-factory.ts` exporting `createRemoteWindow(initialUrl): BrowserWindow`, `hardenedPopupOptions(): BrowserWindowConstructorOptions`, and `attachRemoteHandlers(win): void` — the ONLY place remote windows are constructed and the ONLY place `webPreferences` is written. **Popups are constructed by Electron, not by the factory**: `setWindowOpenHandler` returns `{action:'allow', overrideBrowserWindowOptions: hardenedPopupOptions()}` and `did-create-window` then calls `attachRemoteHandlers`, so the main window and every popup harden via the same code path
- [X] T043 Implement window bounds persistence in `src/main/window/bounds-store.ts` — load, validate against `screen.getAllDisplays()` work areas, clamp to minimums (800×600), reposition off-screen bounds, atomic write via temp-file + rename, debounced ~500ms
- [X] T044 Implement `src/main/window/main-window.ts` creating the single `BrowserWindow` via `createRemoteWindow()` at `https://www.facebook.com/messages`, setting `minWidth`/`minHeight` (800×600) at construction so the window cannot be dragged below a usable size (FR-002) — distinct from the stored-bounds clamping in T043
- [X] T045 Implement `src/main/index.ts` — `requestSingleInstanceLock()`, `second-instance` focus handler, `app.whenReady()` wiring, and `before-quit` flag

### Security assertion suite (M-4) — release blocker

- [X] T046 Write `tests/integration/security-baseline.test.ts` asserting for every remote window and popup: `sandbox`, `contextIsolation`, `webSecurity` true; `nodeIntegration`, `nodeIntegrationInWorker`, `nodeIntegrationInSubFrames`, `allowRunningInsecureContent`, `experimentalFeatures`, `webviewTag` false; **preload absent**; partition is `persist:messenger`; all four navigation layers registered; both permission handlers plus device and display-media handlers registered and denying. **Mechanism per contracts/navigation-policy.md §6a**: assert the frozen baseline constant at unit level AND assert the *realised* renderer state at runtime (`process.contextIsolated`, `process.sandboxed`, `typeof require === 'undefined'`, `window.process === undefined`). `getLastWebPreferences()` MUST NOT be used — it is undocumented and violates Principle IX
- [X] T047 Add a deny-by-default probe to `tests/integration/security-baseline.test.ts` iterating the full Electron permission enum and asserting everything outside approved `media`(audio/video) at the Facebook origin is denied; notifications are deferred
- [X] T048 Add `npm run test:security` script running T046/T047 plus the ESLint static assertions, and wire it into CI as a blocking gate

**Checkpoint**: Hardened window loads Messenger; `npm run test:security` passes. User stories may now begin.

---

## Phase 3: User Story 1 - Sign in and exchange messages (Priority: P1) 🎯 MVP

**Goal**: A person launches the app, signs in through Meta's own flow including 2FA, and exchanges messages.

**Independent Test**: Launch on a clean profile, sign in with a real account including 2FA, send a message to a test conversation, confirm delivery.

- [X] T049 [P] [US1] Write `tests/integration/startup.test.ts` asserting the app opens exactly one window at `https://www.facebook.com/messages` and no second window appears
- [X] T050 [US1] Verification only — confirm the S-2 authentication paths authored in T027 are present in `src/main/security/policy/auth-allowlist.ts` and covered by allowed vectors in `tests/unit/policy/allowlist.test.ts`. Do not add paths here; T027 is the sole author
- [X] T051 [US1] Implement popup handling in `src/main/security/navigation.ts`: `setWindowOpenHandler` runs `decide()`, returns `{action:'allow', overrideBrowserWindowOptions: hardenedPopupOptions()}` for allowlisted targets and `{action:'deny'}` otherwise; a `did-create-window` listener calls `attachRemoteHandlers` on the window Electron creates, so popups carry identical hardened preferences and the same session
- [X] T052 [P] [US1] Write `tests/integration/auth-navigation.test.ts` asserting each authentication path loads in-app and a non-allowlisted path is refused
- [X] T053 [US1] Add a privacy-audit assertion to `tests/integration/security-baseline.test.ts` confirming the application originates no network request to any host outside the Messenger origins and Meta CDNs

**Checkpoint**: Sign-in completes fully in-app; messages send and receive. MVP is demonstrable.

---

## Phase 4: User Story 2 - Stay signed in across restarts (Priority: P1)

**Goal**: The session survives quit, relaunch, and system restart.

**Independent Test**: Sign in, quit fully, relaunch, confirm no sign-in prompt. Repeat after a system restart.

- [X] T054 [P] [US2] Write `tests/integration/session-persistence.test.ts` asserting a persisted partition survives an app restart and that no application-authored copy of session data exists on disk
- [X] T055 [US2] Verify `src/main/session/partition.ts` persists across restarts and that the application never reads, parses, copies, or exports the partition contents
- [X] T056 [US2] Implement invalid-session handling in `src/main/features/errors.ts` so a server-invalidated session presents the sign-in flow rather than an error or blank state
- [X] T057 [P] [US2] Write `tests/unit/settings-privacy.test.ts` asserting `settings.json` accepts only `schemaVersion`, `windowBounds`, and `zoomLevel` and rejects any other key

**Checkpoint**: Session persists across quit, relaunch, and reboot.

---

## Phase 5: User Story 3 - Links behave predictably and safely (Priority: P2)

**Goal**: Non-Messenger links open in the default browser; Messenger links stay in-app.

**Independent Test**: From a conversation with mixed links, click each and confirm routing.

- [X] T058 [P] [US3] Write `tests/integration/navigation.test.ts` asserting non-Messenger Facebook destinations, link shims, and third-party links are routed externally and never navigate the window
- [X] T059 [US3] Add a redirect-chain test to `tests/integration/navigation.test.ts` asserting `login.php?next=<external>` is cancelled at the offending hop by the `will-redirect` layer, with the first hop having been allowed
- [X] T060 [US3] Add a subresource test to `tests/integration/navigation.test.ts` asserting fetches from `fbcdn.net` and `facebook.net` are never cancelled and never routed externally
- [X] T061 [US3] Verify unsafe schemes are dropped in `src/main/security/external-open.ts` and never reach `shell.openExternal`, covered by `tests/unit/policy/external-schemes.test.ts`

**Checkpoint**: All link routing correct, including the hostile and redirect cases.

---

## Phase 6: User Story 4 - A real macOS application (Priority: P2)

**Goal**: Native menu, standard shortcuts, and persistent window geometry and zoom.

**Independent Test**: Resize and move the window, quit, relaunch, confirm geometry restored. Exercise every menu item.

- [X] T062 [US4] Implement the application menu in `src/main/features/menu.ts` per contracts/menu-and-shortcuts.md — **no Find item and no ⌘F/⌘G binding** (FR-025 removed) — with standard Edit roles (undo, redo, cut, copy, paste, selectAll) which are required for clipboard operations to work in the remote page
- [X] T063 [US4] Implement Open Messenger Home in `src/main/features/menu.ts` navigating to the canonical `https://www.facebook.com/messages`
- [X] T064 [US4] Implement zoom controls in `src/main/features/menu.ts` using `webContents.setZoomLevel`, persisting the level via `src/main/window/bounds-store.ts`
- [X] T065 [US4] Implement allowlist-gated Back/Forward in `src/main/features/menu.ts` — read the target entry via `navigationHistory.getEntryAtIndex()`, run `decide()`, and disable the menu item when the entry is not `allow-in-app`
- [X] T066 [P] [US4] Write `tests/unit/bounds-store.test.ts` covering schema validation, minimum clamping, off-screen repositioning after a display change, atomic write, and recovery from a truncated file
- [X] T067 [P] [US4] Write `tests/integration/menu.test.ts` asserting menu structure matches the contract, Open Messenger Home navigates correctly, zoom persists across relaunch, and Back/Forward are disabled for non-allowlisted history entries
- [X] T068 [P] [US4] Write `tests/integration/window-state.test.ts` asserting geometry restores across relaunch and that a second launch focuses the existing window rather than opening a second one

**Checkpoint**: The app behaves as a native macOS application.

---

## Phase 7: User Story 5 - Know when a message arrives (Priority: P2)

**Goal**: Notifications and a Dock unread badge, working while the window is closed.

**Independent Test**: Sign in, close the window, have a second account send a message, confirm notification and badge, click the notification.

- [X] T069 [US5] Apply the background-throttling configuration determined by spike S-6 — the lowest sufficient escalation rung. `backgroundThrottling` is a `webPreferences` key, so it goes in the frozen baseline inside `src/main/security/remote-window-factory.ts`; any Chromium command-line switches from rungs 2–3 go in `src/main/index.ts`. Record the rung, why it is needed, and its measured resource cost in an inline comment
- [X] T070 [US5] Implement hide-not-destroy lifecycle in `src/main/index.ts` — intercept window `close`, `preventDefault()` and `hide()` unless the `before-quit` flag is set, so the remote `webContents` stays alive and keeps producing notifications
- [X] T071 [US5] Implement `app.on('activate')` and `second-instance` handlers in `src/main/index.ts` to show and focus the window, reopening it when hidden
- [X] T072 [P] [US5] Implement the badge parser in `src/main/features/badge.ts` — a pure function extracting a leading `(N)` from the document title, **capping at 999** (counts above that display as `999`, matching the `(999+)` convention the site itself uses), never throwing, returning "no badge" for a non-matching title
- [X] T073 [US5] Wire `page-title-updated` on the remote window's `webContents` to `app.setBadgeCount()` in `src/main/features/badge.ts`
- [X] T074 [P] [US5] Write `tests/unit/badge-title.test.ts` covering `(3) Messenger`, `Messenger`, `(999+) …`, empty, non-numeric, values above the 999 cap, negative and non-integer values, and adversarial titles — asserting no throw, correct clamping, and graceful "no badge"
- [X] T075 [P] [US5] Write `tests/integration/lifecycle.test.ts` asserting closing the window keeps the app running, reactivating reopens it with the existing session and saved geometry without re-authentication, and Quit terminates fully
- [X] T076 [US5] Add a notification pass-through assertion to `tests/integration/lifecycle.test.ts` confirming the application never reads, parses, stores, or logs notification content
- [X] T107 [US5] Implement graceful handling of denied notification permission (FR-061) in `src/main/features/dialogs.ts` and `src/main/security/permissions.ts` — the application continues functioning normally with no error dialog, no console error, and no retry loop when macOS or the web layer has denied notifications; add a regression assertion to `tests/integration/lifecycle.test.ts`
- [X] T108 [US5] Add SC-013 (notification within 5 s of message send, window closed) and SC-014 (Dock badge matches the count the site displays) to the manual-only checklist in `quickstart.md` as **production acceptance checks**, with the rationale recorded — see the C4 note below

**Checkpoint**: Notifications and badge work with the window closed.

---

## Phase 8: User Story 6 - Voice and video calls (Priority: P3)

**Goal**: Voice and video calls work after macOS permissions are granted.

**Independent Test**: Place a call to a second account, grant permissions, confirm two-way audio and video.

- [X] T077 [US6] Populate `src/main/security/policy/permission-origins.ts` with the exact origin set from spike S-5 findings — each entry justified in a comment, and **never** derived from navigation-allowlist membership
- [X] T078 [US6] Add any call-surface paths from spike S-3 to `src/main/security/policy/navigation-allowlist.ts`, with the corresponding constitution amendment merged first
- [X] T079 [US6] Add `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` to the Info.plist configuration in `forge.config.ts`
- [X] T080 [US6] Implement TCC status handling in `src/main/features/dialogs.ts` using `systemPreferences.getMediaAccessStatus` and `askForMediaAccess`, showing a native dialog with an "Open Settings" route when access was previously denied and noting that a restart is required for a TCC change to take effect
- [X] T081 [P] [US6] Write `tests/integration/permissions.test.ts` asserting the check handler decides correctly when `webContents` is `null`, that both handlers are registered on `persist:messenger`, and that every permission outside the approved set is denied

**Checkpoint**: Calls work; permission denial produces guidance rather than a hang.

---

## Phase 9: User Story 7 - Downloads land where the user chooses (Priority: P3)

**Goal**: Every download prompts for a save location and nothing auto-opens.

**Independent Test**: Download an attachment, confirm the save panel appears and the file is written unmodified.

- [X] T082 [US7] Implement download handling in `src/main/features/downloads.ts` on `session.on('will-download')` — never call `setSavePath`, set `setSaveDialogOptions` with a basename-only default so a site-suggested filename cannot escape the chosen directory, and never open or execute on completion
- [X] T083 [P] [US7] Write `tests/unit/download-filename.test.ts` covering suggested filenames containing path separators, `..` segments, null bytes, and excessive length
- [X] T084 [US7] Add the download save panel, cancel-writes-nothing, and no-auto-open items to the manual checklist in `quickstart.md` (Playwright cannot intercept native dialogs)

**Checkpoint**: Downloads are user-directed and inert.

---

## Phase 10: User Story 8 - Clear, honest failure (Priority: P3)

**Goal**: Offline and load failures produce a comprehensible screen with retry, never a blank window.

**Independent Test**: Disconnect the network, launch, observe; reconnect and retry.

- [X] T085 [P] [US8] Create the inert offline/error page `src/renderer-static/error.html` and `src/renderer-static/error.css` — **no script and no preload**; the retry control is a plain `<a href="https://www.facebook.com/messages">` which the allowlist permits, so no IPC is needed
- [X] T086 [US8] Implement load-failure detection in `src/main/features/errors.ts` on `did-fail-load`, loading the local error page via `loadFile()` with rate-limited retry and exponential backoff
- [X] T087 [US8] Implement the blocked-navigation dialog in `src/main/features/dialogs.ts` — a native `dialog.showMessageBox` that names what was refused, satisfying FR-040 without destroying the session page
- [ ] T088 [P] [US8] Write `tests/integration/offline.test.ts` asserting an offline launch shows the error page rather than a blank window, that retry recovers, and that no unbounded reload loop occurs
- [ ] T089 [US8] Add an assertion to `tests/integration/security-baseline.test.ts` confirming no failure or recovery path mutates the hardened `webPreferences` or unregisters a navigation or permission handler

**Checkpoint**: Every failure mode degrades visibly and safely.

---

## Phase 11: User Story 9 - Clear session data (Priority: P3)

**Goal**: One menu command removes the stored session.

**Independent Test**: Sign in, invoke Clear Session Data, confirm sign-in returns and no session data remains on disk.

- [X] T090 [US9] Implement Clear Session Data in `src/main/session/clear-session.ts` — destructive confirmation dialog defaulting to Cancel, then `clearStorageData()`, `clearCache()`, `clearAuthCache()`, badge reset, zoom reset, and navigation back to the canonical URL
- [X] T091 [US9] Wire the Clear Session Data menu item in `src/main/features/menu.ts`
- [X] T092 [P] [US9] Write `tests/integration/clear-session.test.ts` asserting the partition directory holds no cookies or storage after clearing and that the sign-in flow returns
- [X] T093 [US9] Add the confirmation-dialog cancel case to the manual checklist in `quickstart.md`

**Checkpoint**: Session removal is complete and reversible only by signing in again.

---

## Phase 12: User Story 10 - Honest attribution (Priority: P3)

**Goal**: An About window stating independence from Meta.

**Independent Test**: Open the About window and read it.

- [X] T094 [P] [US10] Implement the About window in `src/main/features/about.ts` showing product name, version, and an explicit disclaimer of non-affiliation with, endorsement by, or sponsorship from Meta
- [X] T095 [US10] Wire the About menu item in `src/main/features/menu.ts`
- [X] T096 [US10] Configure the provided MessengerBrowser application icon for packaging (resolves TODO(APP_ICON))

**Checkpoint**: All ten user stories are independently functional.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Packaging, distribution, and final verification.

- [X] T097 Create `build/entitlements.mac.plist` with **exactly three** entitlements — `com.apple.security.cs.allow-jit`, `com.apple.security.device.camera`, `com.apple.security.device.audio-input` — and explicitly NOT `allow-unsigned-executable-memory`, `disable-library-validation`, or `allow-dyld-environment-variables`
- [X] T098 Configure conditional `osxSign` and `osxNotarize` in `forge.config.ts` with a Keychain profile (not `appleIdPassword`), Hardened Runtime enabled, and arm64-only output; signed builds require credentials
- [ ] T099 [P] **Future/optional signed-release task:** Write `tests/integration/entitlements.test.ts` or a CI script asserting the signed bundle carries exactly the three expected entitlements and no others
- [ ] T100 **Future/optional signed-release task:** Run `npm run make`, then verify with `codesign --verify --deep --strict`, `spctl --assess --type execute`, and `codesign -d --entitlements -`
- [ ] T101 **Future/optional signed-release task:** Install the DMG on a clean Mac; confirm launch with no Gatekeeper warning (SC-011)
- [X] T102 [P] Write `README.md` documenting expected limitations caused by changes to Meta's website — that the app injects nothing and depends on no selectors, so site changes degrade to normal page loads; that the unread badge depends on the document title and silently disappears if that changes; and that navigation or authentication path changes surface as an explicit blocked-navigation message requiring a constitution amendment
- [X] T103 Document the Electron 43 EOL date (2027-01-05) and the required upgrade-plus-constitutional-re-audit in `README.md`
- [ ] T104 Execute the full `quickstart.md` validation sequence V1–V13 including the manual-only checklist
- [ ] T105 Run the constitution compliance re-audit required by the release gate and record the result
- [ ] T106 Run `/speckit-analyze` for full cross-artifact consistency including task coverage

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Spike)**: BLOCKING GATE. No dependencies, but blocks absolutely everything else.
- **Phase 1 (Setup)**: Depends on the Phase 0 decision being recorded and amendments merged.
- **Phase 2 (Foundational)**: Depends on Setup. BLOCKS all user stories.
- **Phases 3–12 (User Stories)**: All depend on Foundational. Then proceed in priority order or in parallel if staffed.
- **Phase 13 (Polish)**: Depends on all desired user stories.

### Critical spike dependencies

| Task | Blocked by | Why |
| --- | --- | --- |
| T027 auth allowlist | T004 (S-2) | Path set is unknown until observed |
| T077 permission origins | T008 (S-5) | Origin set must come from findings, never assumption. T028 creates the empty module and is NOT blocked |
| T069 throttling config | T010 (S-6) | The escalation rung is a spike output |
| T072, T073, T074 badge | T011a (S-9) | Parser must be written against an observed title format; a negative S-9 drops FR-056 instead |
| T070 hide-not-destroy | T010 (S-6) | Design is invalid if throttling breaks it |
| T078 call-surface paths | T005 (S-3) | May require a constitution amendment first |

### User Story Dependencies

- **US1, US2 (P1)**: Independent after Foundational.
- **US3, US4 (P2)**: Independent after Foundational.
- **US5 (P2)**: Independent after Foundational, but T069/T070 are gated on spike S-6.
- **US6 (P3)**: Gated on spike S-3 and S-5.
- **US7–US10 (P3)**: Independent after Foundational.

### Within Each Story

- Policy tests before wiring; pure modules before Electron integration; the security assertion suite before any story is called done.

### Parallel Opportunities

- T017, T018, T021, T022, T023 (Setup config files)
- T026–T029 (the four policy tables — separate files, no interdependency)
- T033–T036 (policy unit test files)
- T049, T052 · T054, T057 · T058, T059, T060 · T066, T067, T068 · T072, T074, T075
- Once Foundational completes, US3, US4, US7, US9, US10 can proceed fully in parallel

---

## Parallel Example: Phase 2 Policy Layer

```bash
# The four allowlist tables are independent files:
Task: "Create top-level navigation allowlist in src/main/security/policy/navigation-allowlist.ts"
Task: "Create authentication allowlist in src/main/security/policy/auth-allowlist.ts"
Task: "Create permission-origin allowlist in src/main/security/policy/permission-origins.ts"
Task: "Create external-scheme allowlist in src/main/security/policy/external-schemes.ts"

# Then the four unit test files:
Task: "Write tests/unit/policy/allowlist.test.ts with the full hostile set"
Task: "Write tests/unit/policy/normalize-origin.test.ts"
Task: "Write tests/unit/policy/permissions.test.ts with the separation invariant"
Task: "Write tests/unit/policy/external-schemes.test.ts"
```

---

## Implementation Strategy

### Gate first

Phase 0 is not optional and not parallelizable with anything. Its purpose is to fail cheaply: S-5 and
S-6 each carry a STOP condition that halts implementation and forces an amendment rather than a
workaround.

### MVP (User Story 1 + 2)

1. Phase 0 gate → decision recorded, amendments merged
2. Phase 1 Setup
3. Phase 2 Foundational — `npm run test:security` passing is the real milestone
4. Phase 3 US1 → sign in and exchange messages
5. Phase 4 US2 → session survives restart
6. **STOP and VALIDATE**: this is a usable product

### Incremental Delivery

US3 (link safety) → US4 (native shell) → US5 (notifications) → US6 (calls) → US7–US10 → Phase 13
packaging. Each adds value without breaking earlier stories.

---

## Notes

### Task ID allocation

Task IDs are **stable identifiers allocated in creation order**, not a strict execution sequence.
T107 and T108 were added after the initial pass and sit in the User Story 5 phase; execution order is
given by phase placement and the Dependencies section, never by numeric order. IDs are never reused
or renumbered, so references from the dependency table and from commit messages stay valid.

### C4 decision — SC-013 and SC-014 remain manual

Both stay **manual production acceptance checks** (T108), because no reliable non-brittle automated
test exists:

- **SC-013** (notification within 5 s) requires a second live account sending a real message through
  Meta's infrastructure. The 5-second bound is dominated by network and Meta's own delivery latency,
  neither of which is under test control, so an automated assertion would be flaky and would
  eventually be weakened or skipped — worse than an honest manual check.
- **SC-014** (badge matches the site's count) would require reading the site's own unread indicator
  to compare against. That means inspecting page content, which Principle VI forbids. Automating it
  would require the exact coupling the constitution exists to prevent.

What *is* automated: the badge title parser is exhaustively unit-tested against adversarial input
(T074), and notification pass-through is asserted (T076). The spike separately measures delivery
latency across all six window states under AC-S6-2. The manual check confirms end-to-end behaviour
that unit tests cannot reach.

### General

- Architecture is **Option A**: zero preload scripts, zero IPC channels. If a task seems to need
  either, it is a design error — re-read research R-011 before adding one.
- The hardened `webPreferences` baseline lives **inside** `remote-window-factory.ts`. It has no
  separate module, because the lint rule forbids the `webPreferences` identifier everywhere else.
- **In-page Find is removed** (FR-025). No ⌘F or ⌘G binding ships.
- `- [ ]` tasks marked [P] touch different files with no interdependency.
- Commit after each task or logical group.
- Any allowlist change requires a constitution amendment merged **before** the code change.

---

## Phase 14: Convergence

- [X] T109 [US3] Deduplicate the session-level `webRequest.onBeforeRequest` navigation handler so each remote session routes an external main-frame destination at most once across the main window and popups, per FR-008 and the four-layer navigation decision (partial)
- [X] T110 [US1] Restrict the observed call-popup placeholder exception to the approved inert `nullblank`/`about:blank` flow and keep generic `about:` navigation rejected, preserving the Constitution VII requirement that `about:` never satisfy the navigation allowlist (contradicts)
- [X] T111 [US10] Replace the About message dialog with the specified native About window while retaining the product name, version, and non-affiliation disclaimer, per FR-043 and the plan’s About-window touchpoint (partial)
