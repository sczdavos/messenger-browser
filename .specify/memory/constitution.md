<!--
SYNC IMPACT REPORT
==================
Version change: 1.3.0 → 1.4.0 (2026-08-01)
Bump rationale: MINOR. Approves the site-delivered notification pass-through and title-derived
Dock badge, records the owner-approved icon exception, and documents the native media-settings
route.

Modified in 1.4.0:
- Notification capability — Facebook may request notifications; the application passes content
  through without reading, parsing, storing, or synthesizing it.
- Dock badge — may use only the leading document-title count, capped at 999; Bell-count DOM
  extraction remains prohibited.
- Branding — the owner approved the supplied MessengerBrowser icon as an explicit exception to
  the visual-identity restriction.
- Media permissions — denied camera/microphone access may open the corresponding Apple privacy
  pane through the native `open` command after explicit user approval.

Resolved in 1.4.0:
- TODO(DEFERRED_NOTIFICATION_BADGE)
- TODO(APP_ICON)

Follow-up TODOs:
- TODO(SIGNING_IDENTITY): Supply an Apple Developer ID identity and notarization Keychain profile
  before distribution.

Modified in 1.3.0:
- Navigation allowlist — added `/groupcall/` as an observed Messenger call surface.
- Authentication paths — added `/privacy/consent/` as an observed Facebook authentication/consent
  surface; Facebook Home `/` remains external and is not allowlisted.
- Deferred capabilities — app-generated macOS notifications and Dock-badge derivation are deferred
  from the MVP and require a future specification and security review together. Bell-count DOM
  extraction is not permitted by this amendment.

Resolved in 1.3.0:
- Phase 0 S-6 default-throttling run survived approximately 11.8 hours without a crash; the
  default-throttling configuration is the selected MVP rung.

-----------------------------------------------------------------------------
Prior: 1.1.0 → 1.2.0 (2026-07-29)
Bump rationale: MINOR. Adds the authentication-path entries that 1.1.0 explicitly provided for
under TODO(AUTH_PATHS), plus a canonical origin and a redirect re-evaluation rule. Filling in a
provision the constitution already made is an expansion, not a redefinition, so MAJOR does not
apply.

Modified in 1.2.0:
- Security & Privacy Constraints → added "Canonical origin and start URL": canonical origin is
  https://www.facebook.com; start/home target is https://www.facebook.com/messages.
- Navigation allowlist — split into Messenger / authentication / redirect-absorption tables.
  Added /login.php, /two_step_verification, /two_factor on facebook.com. messenger.com is
  retained but demoted to redirect absorption only; it is no longer an entry point.
- Authentication paths — replaced the placeholder provision with the enumerated set; added the
  requirement that additional challenge paths be added by amendment after observation.
- Added "Redirect chains MUST be re-evaluated at every hop" (will-redirect, not just
  will-navigate), motivated by the login.php `next` parameter.
- Added an accepted-residual-risk note for in-app login phishing surface.
- Clarified that subresource/CDN loads are never routed externally; only navigation is.
- Added negative tests for the login.php redirect hop and for CDN subresource routing.

Partially resolved in 1.2.0:
- TODO(AUTH_PATHS) — primary sign-in and 2FA paths now specified. Remains open for checkpoint
  and recovery challenge paths, which are to be added by amendment once observed.

-----------------------------------------------------------------------------
Prior: 1.0.0 → 1.1.0 (2026-07-29)
Bump rationale: MINOR. Two amendments, neither of which permits anything previously prohibited:
(a) Principle VII and the navigation allowlist were TIGHTENED from host-level Meta domains to
Messenger surfaces identified by host AND path — a narrowing, which the versioning policy files
under MINOR ("tightened guidance"); (b) Principle XIII was materially expanded with a recorded
approval. The approval is an exercise of the clause already present in 1.0.0 ("without separate
approval"), not a redefinition of the rule, so MAJOR does not apply.

Modified in 1.1.0:
- VII. Navigation Containment — scoped to Messenger surfaces; other facebook.com destinations
  now explicitly route to the default browser.
- Security & Privacy Constraints → Navigation allowlist — replaced host-only allowlist with a
  host+path table; separated top-level navigation from subresource loading (fbcdn.net and
  facebook.net are subresource origins and were incorrectly listed as navigation targets in
  1.0.0); added whole-segment path matching rules, required negative tests, external-open scheme
  safety, and an authentication-path provision.
- XIII. Trademark and Branding Restraint — added a Recorded Approvals subsection approving
  "MessengerBrowser" as product name and bundle-identifier basis; approval scoped to the
  wordmark only, with icon/visual-identity restrictions made explicit.

Resolved in 1.1.0:
- TODO(PRODUCT_NAME) — resolved for the name. "MessengerBrowser" is the approved product name;
  it is no longer an internal codename. Icon and visual identity remain open, tracked as
  TODO(APP_ICON).

-----------------------------------------------------------------------------
Prior: (unversioned template) → 1.0.0
Bump rationale: Initial ratification. All placeholder tokens replaced with concrete,
project-specific governance derived from the 14 principles supplied by the project owner.

Modified principles (template slot → ratified principle):
- [PRINCIPLE_1_NAME] → I. Untrusted Remote Content (NON-NEGOTIABLE)
- [PRINCIPLE_2_NAME] → II. No Native Capability Exposure (NON-NEGOTIABLE)
- [PRINCIPLE_3_NAME] → III. Isolation and Sandboxing (NON-NEGOTIABLE)
- [PRINCIPLE_4_NAME] → IV. Minimal Session Persistence
- [PRINCIPLE_5_NAME] → V. No Data Collection or Inspection (NON-NEGOTIABLE)
- (new) → VI. No Brittle DOM Injection
- (new) → VII. Navigation Containment
- (new) → VIII. Minimal First Release
- (new) → IX. Platform APIs and Automated Tests Over Workarounds
- (new) → X. Fail Safe on Upstream Change
- (new) → XI. TypeScript Strict Mode
- (new) → XII. Acceptance Criteria and Security Impact Per Capability
- (new) → XIII. Trademark and Branding Restraint
- (new) → XIV. Locally Signed and Notarized Distribution

Added sections:
- Security & Privacy Constraints (replaces [SECTION_2_NAME]/[SECTION_2_CONTENT])
- Development Workflow & Quality Gates (replaces [SECTION_3_NAME]/[SECTION_3_CONTENT])
- Governance (concretized from [GOVERNANCE_RULES])

Removed sections: none (all template slots were filled, none dropped).

Deferred TODOs (as of 1.1.0):
- TODO(AUTH_PATHS): Primary sign-in and 2FA paths are specified as of 1.2.0. Still open: whether
  account-checkpoint and password-recovery challenge paths must also be reachable in-app. To be
  observed in a real sign-in and added by amendment, not guessed.
- TODO(MESSENGER_PATHS): The Messenger path allowlist currently covers /messages and
  /messenger_media. Additional Messenger surfaces discovered in use are to be added by
  amendment to the allowlist table.
- TODO(SIGNING_IDENTITY): Apple Developer ID signing identity and notarization Team ID are
  not yet recorded; required before the first distributable build under Principle XIV.
-->

# MessengerBrowser Constitution

<!--
"MessengerBrowser" and the supplied application icon are approved project branding; see
Principle XIII → Recorded Approvals.
-->

The project builds a security-first, macOS-only desktop application that wraps the official
Messenger web experience. The application MUST NOT reproduce, reimplement, or reverse-engineer
Messenger APIs, protocols, or wire formats. It is a hardened container around the vendor's own
web client, and nothing more.

## Core Principles

### I. Untrusted Remote Content (NON-NEGOTIABLE)

All content loaded from `facebook.com`, `messenger.com`, and their subdomains and CDNs MUST be
treated as untrusted, attacker-controlled input. No script, response, message, or DOM state
originating from the remote page may be trusted to be well-formed, benign, or stable. Any code
path that receives data from the remote page MUST validate it at the trust boundary before use.

*Rationale*: The application has no control over what Meta serves, and a compromised or
malicious remote page is the primary threat this application must contain.

### II. No Native Capability Exposure (NON-NEGOTIABLE)

The remote page MUST NOT be granted access to Node.js integration, the filesystem, shell or
process execution, the system clipboard, the macOS Keychain, native modules, or unrestricted
IPC. `nodeIntegration` MUST be disabled in every renderer and every embedded frame. No preload
script may expose a general-purpose bridge, an `eval`-like channel, or a pass-through invoke
function. Any bridge that exists MUST expose a fixed, enumerated set of narrow, typed,
parameter-validated operations.

*Rationale*: Remote-code-execution in the renderer must not become code execution on the
user's machine. A single over-broad bridge method defeats every other control in this document.

### III. Isolation and Sandboxing (NON-NEGOTIABLE)

`contextIsolation` MUST be enabled, `sandbox` MUST be enabled, and `webSecurity` MUST remain
enabled for every `BrowserWindow`, `WebContentsView`, and `webview` the application creates.
Disabling any of these three settings — globally, per-window, or temporarily for debugging in
committed code — is prohibited. Chromium's site isolation MUST NOT be weakened by command-line
switches.

*Rationale*: Context isolation and the Chromium sandbox are the load-bearing controls that
make Principles I and II enforceable rather than aspirational.

### IV. Minimal Session Persistence

The application MUST persist only the browser session state required for the user to remain
signed in across launches: cookies, and the local/session storage the vendor's web client
itself maintains. The application MUST NOT create its own copy, export, cache, or backup of
that state. Persisted data MUST live in the application's own Electron session partition under
the standard macOS application-support location, and MUST be fully removable by a documented
sign-out or reset action.

*Rationale*: Session data is the highest-value secret the application touches. The smallest
surface that still satisfies "stay signed in" is the correct surface.

### V. No Data Collection or Inspection (NON-NEGOTIABLE)

The application MUST NOT collect, inspect, parse, transmit, or log message contents,
credentials, cookies, authentication tokens, contact lists, or user identifiers. No analytics,
telemetry, crash-report body containing page content, or remote logging endpoint may be added.
Diagnostic logging MUST be limited to application-lifecycle events and MUST be reviewed to
confirm that no request bodies, headers, URLs containing tokens, or page text can reach a log
sink.

*Rationale*: The application's value proposition is that it is a container, not an observer.
Any inspection capability is both a privacy breach and a new exfiltration target.

### VI. No Brittle DOM Injection

The application MUST NOT inject scripts, stylesheets, or mutations into the remote page's DOM,
and MUST NOT depend on the vendor's CSS class names, DOM structure, ARIA labels, or internal
JavaScript objects. An exception requires a separately approved requirement that documents why
the capability is essential, what breaks when the selector changes, and how the failure is
detected and degraded (see Principle X).

*Rationale*: DOM-coupled features silently break on every upstream deploy and create
maintenance debt disproportionate to their benefit.

### VII. Navigation Containment

In-app top-level navigation MUST be restricted to Messenger surfaces specifically — not to Meta
domains generally. Being on an approved host is not sufficient; the URL MUST also be a Messenger
surface by path (see *Security & Privacy Constraints* for the enumerated allowlist). Any
navigation outside that allowlist MUST be cancelled in-app and opened in the user's default
browser instead, **including** other `facebook.com` destinations such as Pages, profiles,
Marketplace, Watch, groups, and settings. `window.open`, target-`_blank` links, and
renderer-initiated navigation MUST all route through the same allowlist check — no bypass path
may exist. New `WebContents` creation MUST be denied by default.

*Rationale*: An unconstrained embedded browser is a phishing and drive-by surface with the
application's own privileges and session cookies attached. Scoping to Messenger surfaces alone
also keeps the application honestly what it claims to be — a Messenger container, not a
general Facebook client.

### VIII. Minimal First Release

The first release MUST support exactly one signed-in account, exactly one main window, and no
custom Messenger API integration. Multi-account support, multiple windows, workspace switching,
message search, custom notification parsing, and any feature requiring knowledge of Messenger's
internal API are out of scope for v1 and MUST be proposed as separate, individually reviewed
capabilities.

*Rationale*: Scope discipline is a security control. Every additional surface in v1 is a
surface reviewed under time pressure.

### IX. Platform APIs and Automated Tests Over Workarounds

Implementations MUST prefer documented, supported Electron and macOS platform APIs over
private APIs, undocumented behavior, patched dependencies, or clever workarounds. Where a
supported API does not exist, the gap MUST be documented and the capability deferred rather
than hacked around. Every behavior that can be asserted automatically MUST have an automated
test; manual verification is acceptable only for behaviors that cannot be automated, and those
MUST be listed explicitly.

*Rationale*: This application will outlive several Electron and macOS releases. Maintainability
is what keeps it patchable, and patchability is what keeps it secure.

### X. Fail Safe on Upstream Change

The application MUST fail closed and remain usable when the remote website, authentication
flow, or permission model changes. Load failures, redirects to unexpected hosts, denied
permissions, and missing expected page state MUST produce a clear, actionable user-facing state
— never a blank window, a silent hang, an infinite reload loop, or a crash. Failures MUST NOT
downgrade any control from Principles II, III, or VII as a recovery strategy.

*Rationale*: The application depends on a service that changes without notice. Degradation must
be predictable and must never trade safety for availability.

### XI. TypeScript Strict Mode

All application code MUST be TypeScript compiled with `strict: true`. `noUncheckedIndexedAccess`
and `exactOptionalPropertyTypes` MUST be enabled. `any` MUST NOT appear in code that crosses the
main/renderer boundary or that handles remote-page data; `unknown` plus explicit narrowing is
required there. `@ts-ignore`, `@ts-expect-error`, and non-null assertions on trust-boundary data
MUST NOT be committed without an inline justification comment. The build MUST fail on type
errors.

*Rationale*: The trust boundary is enforced by validation code; strict typing is what proves
that validation is actually total.

### XII. Acceptance Criteria and Security Impact Per Capability

Every capability MUST ship with explicit, testable acceptance criteria and a documented security
impact statement covering: what new attack surface it introduces, which principles it touches,
what data it can reach, and how it fails. A capability whose security impact section is absent,
empty, or reads "none" without justification MUST NOT be merged.

*Rationale*: Security review is only possible against a stated claim. Undocumented capabilities
accumulate silently and are never re-reviewed.

### XIII. Trademark and Branding Restraint

The product name, application icon, bundle identifier, window titles, marketing copy, and
repository-published branding MUST NOT use Facebook or Messenger trademarks, logos, or
confusingly similar marks without separate written approval. Descriptive, non-branded references
to compatibility are acceptable where legally sound; imitation of Meta's marks is not.

**Recorded approvals** (granted under this principle's approval clause):

- **`MessengerBrowser`** is approved as the product name and as the basis of the bundle
  identifier. It is a generic, descriptive compound and is not presented as, or styled to
  resemble, a Meta product mark.

Approvals are name-scoped and do not extend to visual identity. The application icon MUST NOT
use, recolor, or approximate Messenger's lightning-bolt-in-speech-bubble mark or Facebook's "f"
mark, and MUST NOT use Messenger's signature brand gradient in a mark-like arrangement. The
literal strings "Facebook Messenger" and "Facebook" MUST NOT appear as product branding.

**Owner-approved exception (2026-08-01):** the supplied `assets/MessengerBrowser-Icons/MessengerBrowser.icns`
asset is approved for this application despite its speech-bubble and blue-gradient treatment. It
is the owner-provided MessengerBrowser icon and is not to be altered or presented as a Meta mark.

*Rationale*: Trademark exposure is a project-ending risk that no technical control mitigates.
Descriptive naming is defensible; visual imitation is where confusion claims actually originate,
so the approval is deliberately limited to the wordmark.

### XIV. Locally Signed and Notarized Distribution

Initial distribution MUST be a locally built macOS application signed with an Apple Developer ID
certificate and notarized with Apple, distributed outside the Mac App Store. The Hardened
Runtime MUST be enabled. Entitlements MUST be the minimum set required to run, MUST be reviewed
on every change, and MUST NOT include `com.apple.security.cs.allow-unsigned-executable-memory`,
`disable-library-validation`, or `allow-dyld-environment-variables` unless a documented Electron
requirement forces it. Mac App Store submission is explicitly out of scope for the first
release.

*Rationale*: Notarization plus Hardened Runtime is the baseline macOS users are entitled to
expect, and entitlement creep quietly undoes the sandboxing won in Principle III.

## Security & Privacy Constraints

**Electron configuration baseline.** Every window and embedded view MUST be created with
`nodeIntegration: false`, `nodeIntegrationInWorker: false`, `nodeIntegrationInSubFrames: false`,
`contextIsolation: true`, `sandbox: true`, `webSecurity: true`, and `allowRunningInsecureContent:
false`. Remote content MUST load over HTTPS only.

**Scope of the allowlist.** The navigation allowlist governs *top-level document navigation* and
new-window/`window.open` requests only. It MUST NOT be applied to subresource loads — scripts,
stylesheets, images, media, fonts, XHR, and WebSocket traffic from `fbcdn.net`, `facebook.net`,
`messenger.com`, and `facebook.com` are how the page functions, and MUST NOT be cancelled or
handed to the external browser. Subresources are governed by `webSecurity` and request
filtering, not by this allowlist. Only navigation — a link the user activates, or a
script-initiated document-level location change — is subject to external routing. Loading a CDN
asset MUST never open the system browser.

**Canonical origin and start URL.** The application's canonical origin is
`https://www.facebook.com`. The start URL, the "home" action, and any post-sign-in landing
target MUST be `https://www.facebook.com/messages`. The application MUST NOT itself navigate to
`messenger.com` as an entry point, and MUST NOT rewrite or construct URLs on any other origin.

**Navigation allowlist (in-app).** In-app top-level navigation is permitted only for `https:`
URLs matching one of the entries below. Path conditions use the whole-segment rule defined under
*Matching rules*: `pathname === P || pathname.startsWith(P + '/')`. Query strings and fragments
are ignored when matching.

*Messenger surfaces:*

| Host (exact or subdomain) | Path (P) |
| --- | --- |
| `facebook.com` | `/messages` |
| `facebook.com` | `/messenger_media` |
| `facebook.com` | `/groupcall` |

*Authentication surfaces* — permitted because sign-in cannot be completed in the external
browser (the resulting session would land in the wrong cookie jar):

| Host (exact or subdomain) | Path (P) |
| --- | --- |
| `facebook.com` | `/login.php` |
| `facebook.com` | `/two_step_verification` |
| `facebook.com` | `/two_factor` |
| `facebook.com` | `/privacy/consent` |

*Redirect absorption:*

| Host (exact or subdomain) | Path (P) |
| --- | --- |
| `messenger.com` | any path |

`messenger.com` is allowed **only** so that a vendor-initiated redirect away from
`www.facebook.com/messages` does not eject the user into the system browser mid-session. It is
not an entry point and MUST NOT be used as one (see *Canonical origin and start URL*).

Everything else opens in the default browser — explicitly including all other `facebook.com`
destinations (Pages, profiles, groups, Marketplace, Watch, notifications, settings, help), all
third-party links shared inside conversations, and all link-shim redirects such as
`l.facebook.com` and `lm.facebook.com`.

The allowlist MUST be extensible by adding entries to these tables and its single implementing
module together; additional Messenger or authentication surfaces discovered later MUST be added
by amendment rather than by a broad host-level exception for `facebook.com`.

**Matching rules.** Matching MUST use a WHATWG-parsed URL, in exactly one module, and MUST:

- require `protocol === 'https:'` — `http:`, `javascript:`, `data:`, `file:`, `blob:`, and
  `about:` MUST never satisfy the allowlist;
- match host with exact-or-subdomain semantics against the registrable domain — never substring,
  `includes`, `endsWith` on the raw string, or regex over the full URL;
- match path on **whole segments**: a bare `startsWith('/messages')` is prohibited because it
  also matches `/messagesomething`. The required form is `pathname === P || pathname.startsWith(P + '/')`;
- compare against `url.pathname` from the parsed URL, so that percent-encoding and dot segments
  are already normalized, and MUST ignore query and fragment when deciding;
- reject any URL carrying userinfo (`username`/`password` non-empty) before host comparison.

**Required negative tests.** The allowlist test suite MUST include, at minimum:
`https://facebook.com.evil.example/messages`, `https://evil-facebook.com/messages`,
`https://www.facebook.com/messagesomething`, `https://www.facebook.com@evil.example/messages`,
`https://www.facebook.com/marketplace`, `https://www.facebook.com/somepage`,
`http://www.facebook.com/messages`, `https://l.facebook.com/l.php?u=...`, and
`javascript:alert(1)` — each asserted to be routed externally or blocked, never opened in-app.

The suite MUST additionally assert that a `https://www.facebook.com/login.php?next=<external>`
request whose redirect hop targets a non-allowlisted destination is cancelled at that hop, and
that a subresource fetch from `fbcdn.net` is never routed externally.

**External-open safety.** URLs handed to the system browser MUST first be checked against an
allowlist of safe schemes (`https:`, `http:`, `mailto:`, `tel:`). Any other scheme — notably
`javascript:`, `data:`, `file:`, and custom application schemes — MUST be dropped, never passed
to `shell.openExternal`.

The two explicitly approved Apple privacy-pane URLs used for camera and microphone guidance are
handled only by the native `open` command after a user-selected "Open Settings" action; they are
not accepted by or passed through the general external-browser sink.

**Authentication paths.** The authentication entries above are enumerated, not open-ended. They
MUST live in the same single module as the Messenger entries, MUST NOT be widened to a
host-level exception for `facebook.com`, and MUST be re-reviewed whenever the sign-in flow
changes. A sign-in step that lands on a path outside the allowlist MUST fail visibly per
Principle X — never silently, and never by relaxing the allowlist at runtime. Additional
challenge paths are likely to surface in practice (account checkpoints and recovery flows are
the common ones); each MUST be added by amendment after being observed, not pre-emptively. See
TODO(AUTH_PATHS).

**Redirect chains MUST be re-evaluated at every hop.** Checking only the initially requested URL
is insufficient. `login.php` accepts a caller-supplied `next` parameter, so a crafted link can
pass the allowlist on its first hop and redirect to an arbitrary destination afterwards. The
allowlist check MUST therefore run on server-issued redirects as well as on renderer-initiated
navigation (in Electron terms: `will-redirect` in addition to `will-navigate`), and a hop that
fails the check MUST be cancelled and routed externally even though an earlier hop passed.

**Residual risk, accepted.** Allowing `/login.php` in-app means a link shared inside a
conversation can open a genuine Facebook login page inside the application chrome. The host and
TLS are verified by the allowlist, so this is Facebook's real login form rather than a
look-alike, but the application window offers the user fewer origin cues than a browser does.
This is accepted as the cost of in-app sign-in; it MUST NOT be mitigated by injecting UI into
the remote page (Principle VI).

**Permission handling.** Chromium permission requests (notifications, camera, microphone,
geolocation, MIDI, HID, serial, USB, clipboard-read, and any future permission) MUST be denied
by default. Only permissions required by an approved capability may be allowed, and each MUST be
listed with its justification. Unknown or newly introduced permission types MUST be denied.

**IPC contract.** All IPC channels MUST be explicitly named, typed, validated on receipt, and
enumerated in a single reviewable location. Dynamic channel names, wildcard handlers, and
forwarding of arbitrary arguments to native APIs are prohibited. The sender of every
main-process handler MUST be verified to be an expected `WebContents`.

**Secrets and storage.** The application MUST NOT write credentials, tokens, or cookies to any
location it manages itself. Keychain access MUST NOT be used in v1. Only Electron's session
partition storage is permitted for persistence.

**Downloads and external content.** Downloads MUST be routed to the user's chosen location via
the standard macOS save panel and MUST NOT be auto-opened or executed.

## Development Workflow & Quality Gates

**Specification gate.** Every capability begins as a specification with acceptance criteria and
a security impact statement (Principle XII). Specifications that touch the trust boundary MUST
name the principles they engage.

**Review gate.** Every change MUST be reviewed against this constitution. A reviewer MUST
explicitly confirm that the change does not weaken `contextIsolation`, `sandbox`,
`nodeIntegration`, `webSecurity`, the navigation allowlist, the permission denials, or the IPC
contract. Changes that touch those controls require heightened scrutiny and an explicit note in
the change description.

**Automated gates.** The build MUST fail on: TypeScript errors under strict mode, lint errors,
failing tests, and any automated check that detects a disabled security setting. A test suite
asserting the Electron security baseline and the navigation allowlist MUST exist and MUST run in
CI.

**Dependency policy.** Dependencies MUST be minimal, pinned via lockfile, and reviewed on
addition. Electron MUST be kept on a supported release line and updated for security releases;
an out-of-support Electron version is a release blocker.

**Release gate.** A release requires: all automated gates green, entitlements reviewed against
Principle XIV, signing and notarization succeeding, and a documented manual verification of
sign-in, sign-out, external-link handling, and offline/failure behavior.

## Governance

This constitution supersedes all other development practices, conventions, and preferences for
this project. Where a tool default, a framework convention, or a convenience conflicts with a
principle here, the principle wins.

**Amendment procedure.** Amendments MUST be proposed as a written change to this file that
states the motivating problem, the exact principle text added, removed, or modified, and the
security consequence of the change. Amendments to any principle marked NON-NEGOTIABLE require
explicit written approval from the project owner and a documented justification of why the
control is no longer necessary or is replaced by an equivalent control. Amendments take effect
on merge.

**Versioning policy.** This constitution is versioned with semantic versioning:

- **MAJOR** — a principle is removed, or redefined in a way that permits something previously
  prohibited (for example, relaxing a NON-NEGOTIABLE control).
- **MINOR** — a new principle or section is added, or existing guidance is materially expanded
  or tightened.
- **PATCH** — clarifications, wording, formatting, and typo fixes with no change in meaning.

**Compliance review.** Compliance is verified at the review gate for every change, and re-audited
in full before every release and on every Electron major-version upgrade. Any discovered
violation MUST be recorded and either fixed before release or accepted in writing by the project
owner with a stated expiry. Complexity and exceptions MUST be justified in the change that
introduces them; an undocumented exception is a defect.

**Version**: 1.2.0 | **Ratified**: 2026-07-29 | **Last Amended**: 2026-07-29
