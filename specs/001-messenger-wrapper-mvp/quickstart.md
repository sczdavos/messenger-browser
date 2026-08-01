# Quickstart & Validation Guide: MessengerBrowser MVP

**Date**: 2026-07-29 | **Feature**: `001-messenger-wrapper-mvp`

How to run, test, and validate the application against its success criteria. Implementation detail
belongs in `tasks.md`; this is the run-and-verify guide.

---

> **Before any of this**: [spike.md](./spike.md) is a blocking Phase 0 gate. Production
> implementation must not begin until it records a GO or GO-WITH-AMENDMENTS decision covering
> authentication challenge paths, calls, and background notifications.

## Prerequisites

| Requirement | Version | Notes |
| --- | --- | --- |
| macOS | 15 (Sequoia) or 26 (Tahoe) | Apple Silicon only |
| Node.js | 22 LTS or newer | build tooling only; the app runs Electron's bundled Node 24.18 |
| Xcode Command Line Tools | current | required for signing |
| Apple Developer ID | — | required only for a distributable build — `TODO(SIGNING_IDENTITY)` |
| A real Messenger account | — | required for anything past the security tests |
| A second account | — | required for call and notification validation |

---

## Setup

```bash
npm ci                       # lockfile-pinned; Electron 43.2.0
npm run typecheck            # must pass with zero errors before anything else
npm run lint
```

`npm run typecheck` failing is a hard stop — Constitution XI requires the build to fail on type
errors.

---

## Run

```bash
npm start                    # Electron Forge dev run
```

Expected on first launch: one window at `https://www.facebook.com/messages`, showing Meta's sign-in.
Nothing else opens; no devtools; no additional windows.

---

## Test commands

```bash
npm run test:unit            # Vitest — pure logic, no Electron process
npm run test:integration     # Playwright _electron — app behaviour
npm test                     # both
```

`test:unit` must be fast enough to run on every save. The allowlist suite carries most of the
product's security weight and has no Electron dependency by design.

---

## Validation scenarios

Each maps to success criteria in [spec.md](./spec.md). Run in order; later scenarios assume a
signed-in session.

### V1 — Security baseline (automated, no account needed) → SC-006, FR-044–FR-046

```bash
npm run test:integration -- security-baseline
```

Asserts on the live application, for every remote window and popup: **no preload**; `nodeIntegration`,
`nodeIntegrationInWorker`, `nodeIntegrationInSubFrames`, `allowRunningInsecureContent`,
`experimentalFeatures`, and `webviewTag` all false; `contextIsolation`, `sandbox`, and `webSecurity`
true; partition is `persist:messenger`; all four navigation layers registered; both permission
handlers plus the device and display-media handlers registered and denying. Runs alongside the static
lint assertions (no `preload` key anywhere in the codebase, no window construction outside the
factory, no `shell.openExternal` outside `external-open.ts`). See
[contracts/navigation-policy.md](./contracts/navigation-policy.md) §6.

**This suite failing is a release blocker regardless of anything else.**

### V2 — Navigation allowlist (automated) → SC-004, SC-005

```bash
npm run test:unit -- allowlist
npm run test:integration -- navigation
```

Every vector in [contracts/navigation-policy.md](./contracts/navigation-policy.md), including
the hostile set (`facebook.com.evil.example`, `www.facebook.com@evil.example`,
`/messagesomething`, `javascript:`) and the `login.php?next=` redirect-hop cancellation.

### V3 — Sign in → SC-001, SC-002

Launch with a clean profile, sign in with a real account including two-factor. Expect: every step
completes in-app; no step opens Safari; the conversation list appears.

> If a step redirects to a checkpoint or recovery path, the application shows the FR-040 blocked
> message. **This is the known open risk** — record the exact path observed, add it to the
> constitution's allowlist by amendment, then re-run.

### V4 — Session persistence → SC-003, SC-015

Quit (⌘Q), relaunch → still signed in. Restart the machine, relaunch → still signed in. Close the
window (⌘W), reopen from the Dock → still signed in, same geometry, no re-authentication.

### V5 — Link routing (manual) → SC-004, SC-005

From a conversation containing a mixed set of links, click each:

| Link | Expected |
| --- | --- |
| a third-party article | default browser |
| a Facebook Page or profile | default browser |
| a Marketplace or Watch link | default browser |
| another conversation | in-app |
| a shared image / attachment preview | in-app |

The application window must not navigate for any external case, and each must open exactly once.

### V6 — Notifications and badge → SC-013, SC-014

Close the window. Have the second account send a message. Expect a macOS notification within 5
seconds and a Dock badge showing the unread count. Click the notification → the app comes forward.

> **Two known risks here.** The badge depends on the site's document title carrying a leading `(N)`;
> if it does not, the badge is absent by design and the app is otherwise unaffected. Notification
> click-to-focus relies on `app.on('activate')` — verify it empirically (research R-007).

### V7 — Calls (manual, two accounts) → SC-010

Place a voice call, then a video call. Expect macOS camera and microphone prompts on first attempt,
then working two-way audio and video.

> **Known open risk**: if calls open on a path outside the allowlist, they are blocked. Record the
> path and add it by constitutional amendment.

Then deny camera in System Settings and retry: expect the FR-030 explanation and a route to Settings,
not a hang.

### V8 — Downloads (manual — Playwright cannot intercept native dialogs) → FR-032–FR-034

Download an attachment → save panel appears. Cancel → no file written. Confirm → file lands in the
chosen directory, unmodified, and does **not** open automatically.

### V9 — Offline and errors → SC-009

Disconnect the network and launch. Expect the application-rendered offline screen with Retry — never
a blank window. Reconnect, Retry → loads normally. Confirm no reload loop by watching for repeated
requests while offline.

### V10 — Window state → SC-007

Resize and move, quit, relaunch → geometry restored. Then: quit, disconnect the external display the
window was on, relaunch → the window reappears fully on-screen.

### V11 — Clear session data → SC-012

Clear Session Data → confirm dialog → sign-in returns. Cancel on a second attempt → session intact.
Inspect the partition directory: no cookies or storage from the prior session remain.

### V12 — Privacy audit → SC-008

With the app running through a proxy or with Little Snitch, exercise a full session. Assert: every
request originates from the Messenger origins or Meta CDNs. **No request to any other host**, since
there is no telemetry, no analytics, and no update server. Then inspect `userData`: `settings.json`
must contain only geometry and zoom.

---

## Packaging and distribution

```bash
npm run package              # unsigned local build
npm run make                 # signed + notarized DMG, arm64
```

Signing requires a one-time credential setup that keeps the app-specific password out of environment
variables and build logs:

```bash
xcrun notarytool store-credentials "messengerbrowser-notary" \
  --apple-id "<apple-id>" --team-id "<team-id>" --password "<app-specific-password>"
```

### V13 — Distribution verification → SC-011

```bash
codesign --verify --deep --strict --verbose=2 out/**/MessengerBrowser.app
spctl --assess --type execute --verbose out/**/MessengerBrowser.app   # expect: accepted
codesign -d --entitlements - out/**/MessengerBrowser.app              # expect exactly 3 entitlements
```

Entitlements must be exactly `com.apple.security.cs.allow-jit`,
`com.apple.security.device.camera`, `com.apple.security.device.audio-input`. Anything else —
particularly `allow-unsigned-executable-memory` or `disable-library-validation` — violates
Constitution XIV and blocks release.

Then install the DMG on a **clean Mac that has never had the source on it** and launch. Expect no
Gatekeeper warning and no manual override.

---

## Manual-only checklist

Playwright cannot intercept native Electron dialogs (research R-009), so these are verified by hand
before every release:

- [ ] Download save panel appears; cancel writes nothing
- [ ] Clear Session Data confirmation dialog; cancel preserves the session
- [ ] Clear Session Data confirmation dialog; cancel leaves the session and window unchanged
- [ ] Cut / copy / paste inside the remote page's text fields
- [ ] macOS camera and microphone permission prompts
- [ ] About window states independence from Meta and uses no Meta marks
- [ ] Gatekeeper-clean launch on a clean machine
- [ ] **SC-013** — with the window closed, a message from the second account produces a macOS
      notification within 5 seconds
- [ ] **SC-014** — the Dock badge matches the unread count the site itself displays, and clears when
      all conversations are read
- [ ] **FR-061** — with notifications denied in System Settings, the application continues normally:
      no error dialog, no retry loop

> **Why SC-013 and SC-014 are manual rather than automated**: SC-013's 5-second bound is dominated by
> network and Meta's delivery latency, neither under test control, so an automated assertion would be
> flaky and would eventually be weakened or skipped. SC-014 would require reading the site's own
> unread indicator to compare against — inspecting page content, which Principle VI forbids.
> Automating it would require the exact coupling the constitution exists to prevent. The badge parser
> is exhaustively unit-tested instead (T074), and the spike measures delivery latency across all six
> window states under AC-S6-2.

---

## Release gate

Per the constitution: all automated gates green, entitlements reviewed, signing and notarization
succeeding, and the manual checklist complete. Additionally confirm the pinned Electron version is
still supported — **43.2.0 reaches end of life on 2027-01-05**, after which shipping it is a
constitutional violation.
