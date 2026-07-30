# Phase 0 Feasibility Spike (GATE)

**Feature**: `001-messenger-wrapper-mvp` | **Created**: 2026-07-29 | **Status**: Not started

**This is a blocking gate.** Production implementation MUST NOT begin until this spike has run and
its findings are recorded below. Three assumptions underpin the entire plan and none of them has been
observed against the live site: that authentication challenges stay on known paths, that calls work
inside a hardened container, and that notifications survive a hidden window.

---

## Rules for the spike

- **Throwaway code.** The spike lives in `spike/` and is deleted, not merged. No spike code becomes
  production code — it exists to answer questions, so it may be ugly, but it MUST NOT relax a
  security control to get an answer. If a question can only be answered by disabling `sandbox` or
  `contextIsolation`, the answer is "not viable under the constitution" and that is itself the
  finding.
- **Observation only.** No DOM injection, no scraping, no private APIs (Principles I, VI, and
  FR-049). Findings come from Electron main-process events and from what the user sees on screen.
- **Real account, real network.** A second account is required for calls and inbound messages.
- **Record URLs, not content.** Findings capture paths, origins, and event sequences. They MUST NOT
  record message text, contact names, credentials, cookies, or tokens (Principle V).

---

## S-1 — Normal login

**Question**: Does a clean sign-in complete entirely within the current allowlist?

**Method**: Launch with an empty `persist:messenger` partition at
`https://www.facebook.com/messages`. Log every main-frame navigation and redirect hop via
`will-navigate`, `will-redirect`, and `webRequest.onBeforeRequest` (`mainFrame`), printing the full
URL path. Sign in.

**Record**: the ordered list of every main-frame path visited. Any path outside
`/messages`, `/messenger_media`, `/login.php`, `/two_step_verification`, `/two_factor`.

**Pass**: sign-in completes with no path outside the current allowlist.

**Findings**: _not yet run_

---

## S-2 — 2FA, checkpoint, and challenge flows

**Question**: Which authentication paths does the allowlist actually need? This is the spec's largest
known unknown.

**Method**: Exercise, on a test account where possible:

1. two-factor via authenticator app
2. two-factor via SMS
3. a "save this browser / trust this device" interstitial
4. a login-from-new-device checkpoint
5. a password-recovery entry point (start it; abandoning before completion is fine)

**Record**: every main-frame path each flow visits. Specifically watch for `/checkpoint/`,
`/recover/`, `/login/device-based/`, `/authentication/`, and anything else unanticipated.

**Pass**: the complete required path set is enumerated and is small enough to add to the
constitution's authentication allowlist without resorting to a host-level `facebook.com` exception.

**Fail condition worth naming**: if challenge flows wander across many unpredictable paths, the
narrow-allowlist approach in constitution v1.2.0 may not be workable as written, and the constitution
itself needs amending before implementation. That is a legitimate outcome of this spike.

**Findings**: _not yet run_

---

## S-3 — Outgoing voice and video calls

**Question**: Do calls work inside a sandboxed, hardened container, and on which URLs?

**Method**: From a conversation, place a voice call, then a video call, to the second account.
Instrument `setWindowOpenHandler` (log and allow everything, for the spike only), `will-navigate`,
and `did-create-window`.

**Record**:
- does the call render in-page, in a popup window, or in a new top-level navigation?
- the exact URL of any call surface
- whether the call surface is on `facebook.com`, `messenger.com`, or another origin

**Pass**: calls complete with two-way audio and video, and every URL involved is either already on
the allowlist or is a small, enumerable addition.

**Findings**: _not yet run_

---

## S-4 — Incoming calls

**Question**: Do incoming calls surface at all when the window is hidden?

**Method**: With the window hidden (per the FR-058 hide-not-destroy design), have the second account
call. Then repeat with the window visible but unfocused.

**Record**: whether a ring is audible, whether a notification appears, whether a popup is requested,
and whether answering works after the window is restored.

**Pass**: an incoming call is perceivable and answerable in both states.

**Note**: this is the scenario most likely to fail quietly. An incoming call that produces no signal
while hidden would make the product unusable as a primary client even though every listed requirement
technically passes.

**Findings**: _not yet run_

---

## S-5 — Permission origins for camera, microphone, and notifications (**BLOCKING**)

**Question**: Exactly which origins request `media` and `notifications`, and can a permission-specific
allowlist keyed on the normalized `requestingOrigin` grant them correctly?

**Why this is blocking**: the plan assumes `https://www.facebook.com` is the only origin needing
camera and microphone. If Meta's RTC stack runs in a cross-origin iframe, the permission arrives from
a *different* origin with `webContents === null`, and a handler keyed only to `www.facebook.com`
denies it — calls fail with no error and no obvious cause. This single unknown can invalidate FR-028
and SC-010.

### Instrumentation (mandatory fields)

Register **both** `setPermissionRequestHandler` and `setPermissionCheckHandler`. For **every**
`media` and `notifications` event — check *and* request, granted *and* denied — record all of:

| Field | Source | Why |
| --- | --- | --- |
| `permission` | argument | the permission string as given, untrusted |
| `requestingOrigin` (raw) | argument | the authoritative decision input |
| `requestingOrigin` (normalized) | derived | what the allowlist actually compares |
| `details.securityOrigin` | argument | may differ from `requestingOrigin` for `media` |
| `details.embeddingOrigin` | argument | identifies the embedding frame for iframes |
| `details.requestingUrl` | argument | last URL the requesting frame loaded |
| `details.mediaType` | argument | `audio` / `video` / `unknown` |
| `details.isMainFrame` | argument | distinguishes top-level from iframe requests |
| frame URL and origin | `details.frame` / `WebFrameMain` when present | frame identity when `webContents` is null |
| `webContents === null` | derived | **must be recorded explicitly for every event** |
| handler | derived | which of the two handlers fired |
| ordering | derived | check-then-request sequence per permission |

Then exercise: outgoing voice call, outgoing video call, incoming call answered, and first
notification grant. Repeat each at least twice to confirm the origin set is **stable**, not
per-session.

### Decision rule the spike must validate

- Decisions are based on the **normalized** `requestingOrigin`, never on `webContents.getURL()`.
- Normalization: parse with the WHATWG `URL`, take `url.origin`, require `https:`, compare as an
  exact origin string. A literal `"null"` origin (sandboxed iframe) is **denied**, never normalized
  into something matching.
- The lookup uses the **permission-specific allowlist**
  (`policy/permission-origins.ts`), which maps origin → permitted permission set.
- **An origin MUST NOT be granted a permission merely because it appears in the top-level navigation
  allowlist.** Navigability and device trust are independent. The two tables are separate files and
  neither may import the other.

### Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-S5-1 | The complete set of origins requesting `media` is enumerated, with mediaType per origin |
| AC-S5-2 | The complete set of origins requesting `notifications` is enumerated |
| AC-S5-3 | Every such origin is `https:` and is **not** the literal `"null"` origin |
| AC-S5-4 | The origin set is **small (≤ 3) and stable** across repeated runs and a fresh session — not per-session, per-call, or randomized |
| AC-S5-5 | Replaying the recorded events against a permission-specific allowlist containing exactly those origins yields the correct grant/deny for every event, with `webContents === null` cases included |
| AC-S5-6 | No origin requires `media` that is not independently justifiable — an origin needing camera access solely because it is navigable fails this criterion |
| AC-S5-7 | `https://www.messenger.com` — navigable under redirect absorption — is confirmed **not** to require `media`, demonstrating the two lists are genuinely independent |

**PASS**: AC-S5-1 through AC-S5-7 all satisfied, and the resulting `permission-origins.ts` table is a
bounded, explicit list.

**STOP condition**: if the requesting origins are unbounded, randomized per session, dynamically
generated, or require granting the `"null"` origin, a bounded explicit allowlist cannot express the
requirement. **Halt and propose a specification or constitution amendment** before any production
implementation — do not widen the allowlist to a host wildcard, and do not fall back to granting by
navigation allowlist membership.

**Findings**: _not yet run_

---

## S-6 — Notification and message reliability across window states (**BLOCKING**)

**Question**: Do incoming messages *and* notifications keep arriving in every window state the
lifecycle produces, and at what resource cost?

**Do not assume that keeping `webContents` alive is sufficient.** A live `webContents` whose timers,
websockets, or renderer process have been throttled or backgrounded delivers nothing. The spike must
verify **actual message and notification arrival**, not object liveness.

### Test matrix — 6 states × 2 configurations

| State | Definition |
| --- | --- |
| W1 visible + focused | window frontmost |
| W2 visible + inactive | window on screen, another app focused |
| W3 minimized | ⌘M to the Dock |
| W4 fully occluded | entirely covered by another opaque full-screen window (triggers Chromium occlusion detection, which is distinct from being hidden) |
| W5 hidden | via the intercepted `close` → `hide()` (the FR-058 path) |
| W6 extended idle | state W5 sustained for ≥ 2 hours with no interaction |

| Config | Setting |
| --- | --- |
| C1 | default — `backgroundThrottling: true` |
| C2 | `backgroundThrottling: false` on the remote window's `webPreferences` |

Run all 12 cells. In each: send a message from the second account and record the results below.

### Record per cell

| Measurement | Notes |
| --- | --- |
| Message arrives in the page at all | verified on restoring the window — distinguishes "notification suppressed" from "connection dead" |
| macOS notification delivered | yes / no |
| Delivery latency | seconds from send to notification |
| Websocket / connection state | did the transport survive, reconnect, or die |
| Renderer CPU (mean, idle) | over a 30-minute idle window |
| Main-process CPU (mean, idle) | same window |
| RSS at start and end of W6 | growth over 2 hours |
| Energy impact | Activity Monitor rating |
| Wake behaviour | does the app prevent or delay App Nap / system sleep |

### Configuration escalation ladder

If C1 fails, escalate **one rung at a time**, recording which rung is the first to pass and its cost.
Each rung is more expensive than the last; the lowest sufficient rung is the answer.

| Rung | Change | Cost |
| --- | --- | --- |
| 0 | default | none |
| 1 | `backgroundThrottling: false` | modest; renderer timers keep running |
| 2 | + `--disable-background-timer-throttling` | broader; affects all timers |
| 3 | + `--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows` | renderer never deprioritized; measurable battery cost |
| 4 | `powerSaveBlocker('prevent-app-suspension')` | significant battery cost; must be justified explicitly and is the last acceptable rung |

### Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-S6-1 | Messages arrive in the page in **all six** states — no state silently drops the connection |
| AC-S6-2 | Notifications are delivered within **5 seconds** (SC-013) in W2, W3, W4, W5 |
| AC-S6-3 | W6 (≥ 2 h idle) delivers with no degradation in latency or reliability versus W5 |
| AC-S6-4 | The lowest sufficient escalation rung is identified and is **≤ rung 4** |
| AC-S6-5 | At the chosen rung, mean idle CPU (renderer + main) is **≤ 2%** over 30 minutes |
| AC-S6-6 | At the chosen rung, RSS growth over the 2-hour W6 run is **≤ 50 MB** and not monotonic — no leak |
| AC-S6-7 | At the chosen rung, Activity Monitor energy impact while idle is not "High" |
| AC-S6-8 | Any connection loss recovers automatically on state change, without user action and without reloading the page |

**PASS**: AC-S6-1 through AC-S6-8 satisfied at a rung whose cost is documented and accepted.

**STOP condition**: if no rung ≤ 4 delivers reliable background notifications, or the sufficient rung
violates AC-S6-5/6/7, then FR-058's hide-not-destroy lifecycle is not viable as specified. **Halt and
propose a specification or constitution amendment** before production implementation. Candidate
amendments to weigh at that point, not before:

- accept that the window must remain visible (weaken FR-058, keep notifications)
- accept degraded background notifications (weaken FR-055/SC-013, keep the lifecycle)
- accept a documented battery cost at rung 4 (keep both, amend the spec to state the cost)

Do **not** resolve a failure by relaxing a security control, and do not resolve it by polling Meta's
servers from the main process — that would require reproducing Messenger APIs, which FR-049 and
Principle I forbid outright.

**Findings**: _not yet run_

---

## S-7 — Notification click-to-focus

**Question**: Does clicking a page-originated notification bring the app forward? (Research R-007
found no Electron hook for this.)

**Method**: With the window hidden, receive a notification and click it. Log `app.on('activate')`,
window `show`/`focus` events, and whether the page's own handler runs.

**Record**: whether `activate` fires; whether the app comes forward without additional code; whether
the correct conversation is opened.

**Pass**: FR-057 is satisfied by `app.on('activate')` + `show()`.

**Acceptable degraded outcome**: the app comes forward but does not open a specific conversation.
Record it and amend FR-057 rather than adding notification interception, which FR-055 forbids.

**Findings**: _not yet run_

---

## S-9 — Unread-count pattern in the page title (observation only)

**Scope is deliberately narrow.** This section observes one thing: whether Messenger exposes a
stable unread count in the document title. It does **not** implement badge logic, does not parse for
production use, and does not extend to any other page signal. Anything beyond recording observed
title strings is out of scope for this spike.

**Why it is here**: `spec.md` Dependencies lists "site-reported unread count" among its unverified
assumptions, but unlike the other three it had no spike section — it would have been discovered only
by a manual check *after* T072–T076 had already built the feature. This restores the observe-before-
build discipline applied to auth paths, calls, and notifications.

**Method**: attach a `page-title-updated` listener that logs the raw title string and a timestamp.
No DOM access, no injected script, no parsing beyond recording the literal string (Principle VI, and
the spike's observation-only rule). Then, with the second account:

1. Note the title at zero unread.
2. Send one message; note the title.
3. Send several more; note the title at 2, 3, and 5+ unread.
4. Read all messages; note the title returns to its zero-unread form.
5. Repeat once after a page reload to confirm the pattern is not session-specific.

**Record**: the literal title string at each step, and whether a count appears, where it appears, and
in what format (`(3) Messenger`, `Messenger (3)`, `(9+)`, or absent).

### Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-S9-1 | The title format at zero unread and at N unread is recorded verbatim for at least four distinct values of N |
| AC-S9-2 | A count is present in the title and its position and delimiter are consistent across all observations and across a reload |
| AC-S9-3 | The count returns to the zero-unread form when messages are read |
| AC-S9-4 | Any truncation convention above a threshold (e.g. `9+`, `99+`, `999+`) is recorded, so the parser's cap matches the site |

**PASS**: AC-S9-1 … AC-S9-4 satisfied — FR-056 is implementable from the title alone, and T072's
parser can be written against an observed format rather than a guessed one.

**FAIL is an acceptable, expected outcome and is NOT a STOP condition.** If no stable count appears
in the title, **FR-056 (Dock badge) is dropped from the MVP** and `spec.md` is amended accordingly.
It MUST NOT be implemented by reading page content, which Principle VI forbids. Notifications
(FR-055) are independent and unaffected either way — only the badge depends on this.

Unlike S-5 and S-6, this section is **not blocking**: a negative result removes one requirement
rather than invalidating the architecture.

**Findings**: _not yet run_

---

## S-8 — Architecture and constitution revalidation

**Question**: Do the findings above invalidate anything in constitution v1.2.0 or the plan?

**Checklist to complete after S-1…S-7 and S-9**:

- [ ] Navigation allowlist (top-level) — still sufficient? Additions needed?
- [ ] Authentication allowlist — final path set enumerated? Still narrow enough to avoid a host-level exception?
- [ ] Permission-origin allowlist — final origin set from AC-S5-1/2, independent of the navigation allowlist per AC-S5-7?
- [ ] `messenger.com` redirect-absorption — was it ever exercised? Should it stay?
- [ ] Hide-not-destroy lifecycle — viable at which escalation rung, at what documented resource cost?
- [ ] Single-window architecture (Option A) — confirmed sufficient, or is chrome required after all?
- [ ] Unread-count title pattern (S-9) — present and stable, or is FR-056 dropped by amendment?
- [ ] Do any findings require a constitution amendment before implementation? List them.
- [ ] Do any findings invalidate a spec requirement? List the FRs and the required amendments.

**Outcome**: one of —

- **GO** — constitution and architecture stand; implementation may begin.
- **GO WITH AMENDMENTS** — implementation may begin once the listed constitution/spec amendments are
  merged. Expected outcome; S-2 and S-5 will very likely produce additions.
- **NO GO** — a finding invalidates the architecture. Re-plan before writing production code.

**S-5 and S-6 are individually blocking.** Either hitting its STOP condition forces a halt and an
amendment proposal regardless of how every other section scored. A GO cannot be recorded while either
is unresolved.

**Decision**: _not yet run_

---

## Global rule: bounded configuration and explicit allowlists

Every resolution produced by this spike MUST be expressible as either:

1. an **explicit, enumerated allowlist entry** (a path, a host, or an origin), or
2. a **bounded, documented configuration change** drawn from a recorded escalation ladder.

If a finding cannot be resolved that way — if it requires a wildcard, a host-level exception, a
dynamic or per-session set, granting the `"null"` origin, disabling a security control, or an
open-ended behavioural workaround — then **stop**. Write up the finding, propose the specific
specification or constitution amendment it demands, and get that merged before production
implementation begins. Widening a control to make a spike pass is the one outcome this gate exists to
prevent.

---

## Exit criteria

The gate is passed when every section above has recorded findings, S-8 carries an explicit decision,
and any required constitution or spec amendments are merged. Until then, `tasks.md` implementation
work beyond the spike itself MUST NOT start.
