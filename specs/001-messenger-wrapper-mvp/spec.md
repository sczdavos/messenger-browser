# Feature Specification: MessengerBrowser MVP

**Feature Branch**: `001-messenger-wrapper-mvp`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "Build the first version of a standalone macOS desktop application that provides focused access to the official Facebook Messenger web experience. The user launches the application from Finder, Spotlight or the Dock. The application opens a normal macOS window containing the official Messenger website. On first launch, the user signs in using Meta's normal web authentication flow. The authenticated session remains available across application restarts unless the user explicitly clears application data or Meta invalidates the session. […] Success means that a user can install the application, sign in, exchange messages, restart the application without losing the valid session, open external links safely and use Messenger calls after granting the appropriate macOS permissions."

**Governing document**: `.specify/memory/constitution.md` v1.2.0. Every requirement below is subordinate
to that constitution; where this spec appears to permit something the constitution forbids, the
constitution wins.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in and exchange messages in a dedicated window (Priority: P1)

A person installs the application, launches it from the Dock, and sees a normal macOS window showing
the official Messenger web experience. They are not signed in, so Meta's own web sign-in appears.
They enter their credentials, complete two-factor verification if their account requires it, and land
in their conversation list. They read and send messages exactly as they would on the web.

**Why this priority**: This is the entire product. Without it there is nothing to ship, and every
other story is an enhancement to this one.

**Independent Test**: Launch a freshly installed application on a machine with no prior session, sign
in with a real account including 2FA, send a message to a test conversation, and confirm it is
received. Delivers the core value on its own.

**Acceptance Scenarios**:

1. **Given** a first launch with no stored session, **When** the application opens, **Then** it
   displays the Messenger web experience at the canonical start URL and the user can reach a sign-in
   form without leaving the application.
2. **Given** the sign-in form, **When** the user submits valid credentials, **Then** authentication
   completes inside the application and the conversation list appears.
3. **Given** an account with two-factor verification enabled, **When** the flow reaches the
   verification step, **Then** that step is completed inside the application, not in an external
   browser.
4. **Given** a signed-in session, **When** the user sends a message, **Then** the message is
   delivered by the website with no involvement from the application beyond hosting the page.
5. **Given** any point in the above flow, **When** the user inspects application behaviour, **Then**
   no message content, credential, cookie, or token has been read, stored, or logged by the
   application.

---

### User Story 2 - Stay signed in across restarts (Priority: P1)

The user quits the application and relaunches it hours or days later. They are still signed in and
land directly in their conversations. They never re-authenticate unless they explicitly clear the
session or Meta invalidates it.

**Why this priority**: A wrapper that forces re-authentication on every launch is worse than a
browser tab. This is the primary reason to use a dedicated application.

**Independent Test**: Sign in, quit fully, relaunch, and confirm the conversation list appears
without a sign-in prompt. Repeat after a system restart.

**Acceptance Scenarios**:

1. **Given** a signed-in session, **When** the user quits and relaunches, **Then** the conversation
   list appears without re-authentication.
2. **Given** a signed-in session, **When** the machine is restarted and the application relaunched,
   **Then** the session is still valid.
3. **Given** a session that Meta has invalidated server-side, **When** the user relaunches, **Then**
   the sign-in flow appears normally rather than an error state or a blank window.
4. **Given** any stored session, **When** the storage location is inspected, **Then** it contains
   only the web session state the site itself maintains — no application-created copy, export, or
   backup of credentials or tokens.

---

### User Story 3 - Links behave predictably and safely (Priority: P2)

While reading a conversation, the user clicks a link someone sent them — a news article, a YouTube
video, a Facebook Page. It opens in their normal default browser, with their normal extensions and
their normal browsing profile. Messenger links continue to work inside the application.

**Why this priority**: This is the main safety boundary of the product and the main source of
"why did this open here?" confusion if it is wrong. It is P2 only because messaging works without it.

**Independent Test**: From a conversation containing a mix of links, click each and confirm the
routing: Messenger surfaces stay in-app, everything else opens the default browser exactly once.

**Acceptance Scenarios**:

1. **Given** a conversation containing a third-party link, **When** the user clicks it, **Then** it
   opens in the default browser and the application window does not navigate.
2. **Given** a link to a non-Messenger Facebook destination such as a Page, profile, group,
   Marketplace listing, or Watch video, **When** the user clicks it, **Then** it opens in the default
   browser, not in the application.
3. **Given** a link to another conversation, **When** the user clicks it, **Then** it opens inside the
   application.
4. **Given** a link that redirects through a link shim before reaching its destination, **When** the
   user clicks it, **Then** it opens externally and no redirect hop is followed in-app.
5. **Given** a link whose scheme is not a browsable web or contact scheme, **When** it is activated,
   **Then** it is discarded and neither opened in-app nor handed to the operating system.

---

### User Story 4 - A real macOS application, not a kiosk (Priority: P2)

The user expects the application to behave like a Mac application: the window remembers where they
put it, the menu bar has the commands they expect, and the keyboard shortcuts they already know
work — copy, paste, select all, reload, back, forward, find, zoom.

**Why this priority**: This is what separates the product from a browser tab. It is P2 because the
core messaging experience functions without it.

**Independent Test**: Resize and move the window, quit, relaunch, and confirm the geometry is
restored. Exercise every menu item and its shortcut.

**Acceptance Scenarios**:

1. **Given** a resized and repositioned window, **When** the user quits and relaunches, **Then** the
   window is restored to the same size and position.
2. **Given** a restored window whose saved position is off-screen (display disconnected or resolution
   changed), **When** the application launches, **Then** the window is repositioned fully on-screen.
3. **Given** the application menu, **When** the user invokes Reload, Back, Forward, Zoom In, Zoom
   Out, Actual Size, Open Messenger Home, Clear Session Data, or Quit, **Then** each performs its
   stated action.
4. **Given** a text field in a conversation, **When** the user presses the standard cut, copy, paste,
   select-all, and undo shortcuts, **Then** they behave as they do in any Mac application.
5. **Given** any application state, **When** the user invokes Open Messenger Home, **Then** the window
   navigates to the canonical Messenger start URL.
6. **Given** a zoom level set by the user, **When** the application is relaunched, **Then** the zoom
   level is restored.
7. **Given** Back or Forward is invoked, **When** the target history entry is outside the allowed
   Messenger surfaces, **Then** the navigation is refused rather than loading it in-app.

---

### User Story 5 - Know when a message arrives (Priority: P2, deferred from MVP)

This story is deferred from the MVP. It remains the target for a later notification-and-badge phase;
the MVP only retains the hide-not-destroy lifecycle and Dock-icon reactivation behavior.

**Why this priority**: Without this the product is a tab you have to remember to look at. It is P2
rather than P1 because messaging itself works without it, but it is what makes the application usable
as someone's primary Messenger client.

**Independent Test (future phase)**: Sign in, close the window, have a second account send a message,
and confirm a notification and Dock badge appear and that clicking the notification restores the
window to the right conversation.

**Acceptance Scenarios**:

1. **Given** a signed-in session and an unfocused or closed window, **When** a message arrives,
   **Then** a macOS notification appears.
2. **Given** unread messages, **When** the count changes, **Then** the Dock icon badge reflects the
   current unread count and clears when the messages are read.
3. **Given** a notification, **When** the user clicks it, **Then** the application window is brought
   forward, reopening it if it was closed.
4. **Given** the user closes the main window, **When** they do so, **Then** the application keeps
   running and continues to deliver notifications.
5. **Given** the application is running with no open window, **When** the user clicks the Dock icon or
   selects the application, **Then** the main window reopens with the existing session and its saved
   geometry, without re-authentication.
6. **Given** the application is running, **When** the user invokes Quit, **Then** the application
   terminates fully and stops delivering notifications.
7. **Given** notifications are delivered, **When** their content is examined, **Then** the application
   has passed the site's notification through without reading, parsing, storing, or logging it.
8. **Given** the user has denied notification permission at the macOS level, **When** a message
   arrives, **Then** the application does not error or retry in a loop.

---

### User Story 6 - Voice and video calls (Priority: P3)

The user starts or answers a voice or video call from a conversation. macOS asks for camera and
microphone access the first time. Once granted, calls work.

**Why this priority**: Calls are a genuine part of Messenger, but text messaging is the core value
and calls depend on system permissions outside the application's control.

**Independent Test**: Place a call to a second account, grant permissions when prompted, and confirm
two-way audio and video.

**Acceptance Scenarios**:

1. **Given** a first call attempt, **When** the site requests camera and microphone access, **Then**
   macOS presents its permission prompts and the application grants the web-layer request only for
   camera and microphone.
2. **Given** granted permissions, **When** the user places a call, **Then** two-way audio and video
   function.
3. **Given** the user has denied camera or microphone access at the macOS level, **When** they attempt
   a call, **Then** the application surfaces a clear explanation and a route to System Settings rather
   than failing silently or appearing to hang.
4. **Given** the site requests any permission other than camera or microphone — geolocation, screen
   capture, MIDI, HID, serial, USB, or clipboard read — **When** the request is made, **Then** it is
   denied without prompting the user.

---

### User Story 7 - Downloads land where the user chooses (Priority: P3)

Someone sends a photo or document. The user downloads it and is asked where to save it, as they would
be in a browser configured to ask.

**Why this priority**: Expected behaviour for a messaging client, but not required for the core loop.

**Independent Test**: Download an attachment and confirm the save panel appears and the file is
written to the chosen location, unmodified.

**Acceptance Scenarios**:

1. **Given** an attachment, **When** the user downloads it, **Then** a standard save panel appears.
2. **Given** the save panel, **When** the user cancels, **Then** no file is written.
3. **Given** a completed download, **When** it finishes, **Then** the file is not opened or executed
   automatically.

---

### User Story 8 - Clear, honest failure when things break (Priority: P3)

The user's network drops, or Meta changes something, or the page fails to load. Instead of a white
void, they see a plain explanation and a way to retry.

**Why this priority**: The product depends on a service it does not control. Predictable degradation
is a constitutional requirement, but it is P3 because it only manifests on failure.

**Independent Test**: Disconnect the network, launch, and observe. Reconnect and retry.

**Acceptance Scenarios**:

1. **Given** no network connectivity, **When** the application launches, **Then** it shows an
   application-rendered offline message with a Retry action — never a blank window.
2. **Given** the offline message, **When** connectivity returns and the user retries, **Then** the
   Messenger experience loads normally.
3. **Given** a page load that fails or times out, **When** the failure occurs, **Then** the user sees
   what failed and can retry, with no infinite reload loop.
4. **Given** any failure state, **When** the application recovers or degrades, **Then** no security
   control is relaxed as part of the recovery.
5. **Given** repeated automatic retries, **When** they occur, **Then** they are rate-limited so the
   application never hammers the site.

---

### User Story 9 - Clear session data (Priority: P3)

The user wants to sign out completely, or hand the machine to someone else. One menu command removes
the stored session.

**Why this priority**: Required by the constitution's minimal-persistence principle, and the only
sign-out mechanism the application itself offers.

**Independent Test**: Sign in, invoke Clear Session Data, confirm the sign-in flow returns, and
confirm the stored session data is gone from disk.

**Acceptance Scenarios**:

1. **Given** a signed-in session, **When** the user invokes Clear Session Data and confirms, **Then**
   all stored session state is removed and the sign-in flow appears.
2. **Given** the command is invoked, **When** the confirmation dialog appears, **Then** cancelling
   leaves the session intact.
3. **Given** the command has completed, **When** the stored data location is inspected, **Then** no
   cookies, tokens, or site storage from the previous session remain.

---

### User Story 10 - Honest attribution (Priority: P3)

The user opens About and sees plainly what this application is: an independent wrapper, not a Meta
product.

**Why this priority**: Low functional value, high legal value. Required by the constitution's
trademark principle.

**Independent Test**: Open the About window and read it.

**Acceptance Scenarios**:

1. **Given** the application menu, **When** the user opens About, **Then** a window states the product
   name, version, and an explicit disclaimer that the application is independent and not affiliated
   with, endorsed by, or sponsored by Meta.
2. **Given** the About window and the application's visual identity, **When** they are reviewed,
   **Then** no Meta trademark, logo, or confusingly similar mark is used.

---

### Edge Cases

- **Session invalidated while running**: the site logs the user out mid-session. The application must
  present the sign-in flow in place, not an error.
- **Sign-in redirects to an unlisted challenge path** (account checkpoint, password recovery): the
  navigation is refused. The user must see a clear explanation of what was blocked and why, never a
  silent hang or a blank window. See Dependencies.
- **Crafted login link with a redirect parameter**: a link that passes the allowlist on its first hop
  and redirects elsewhere must be cancelled at the offending hop.
- **A popup that produces no window**: if a popup is refused, the user must not be left waiting on an
  interaction that will never complete.
- **Call surface opens in a popup or on an unlisted path**: calls must not be silently broken by the
  navigation rules. See Dependencies.
- **Saved window position references a disconnected display**: the window must be brought back
  on-screen.
- **Two instances launched**: the second launch must focus the existing window rather than opening a
  second session — and must reopen the window if the running instance has none.
- **Notification arrives while the window is closed**: activating it must reopen the window rather
  than being ignored.
- **Site reports no unread count**: the Dock badge must be omitted rather than derived by inspecting
  page content.
- **macOS denies camera or microphone at the system level** after the web layer has granted them.
- **Download of a file whose name contains path separators or is extremely long**: the save panel must
  not be induced to write outside the user's chosen directory.
- **The site changes its markup or URL structure**: because the application injects nothing and
  depends on no selectors, this must degrade to a normal page load, not a broken feature.
- **Extremely small or extremely large window sizes**: a minimum window size must keep the interface
  usable.

## Requirements *(mandatory)*

### Functional Requirements

#### A. Application shell and window

- **FR-001**: The application MUST launch from Finder, Spotlight, and the Dock, and open exactly one
  main window containing the Messenger web experience.
- **FR-002**: The main window MUST be resizable, MUST enforce a minimum size that keeps the interface
  usable, and MUST behave as a standard macOS window (minimise, zoom, full-screen).
- **FR-003**: The application MUST persist the main window's size and position across launches, and
  MUST restore the window fully on-screen when the saved geometry is no longer valid.
- **FR-004**: The application MUST be single-instance: a second launch focuses the existing window.
- **FR-005**: Persisted window geometry and zoom level MUST be the only application-authored state
  stored outside the web session store.

*Security impact*: Window state is non-sensitive and contains no site data. Single-instance behaviour
prevents two windows contending over one session store, which could corrupt session state.

#### B. Content loading and navigation containment

- **FR-006**: The canonical origin MUST be `https://www.facebook.com`, and the start URL and Open
  Messenger Home target MUST be `https://www.facebook.com/messages`.
- **FR-007**: In-app top-level navigation MUST be restricted to the allowlist defined in the
  constitution: Messenger surfaces (`/messages`, `/messenger_media`), enumerated authentication
  surfaces (`/login.php`, `/two_step_verification`, `/two_factor`), and `messenger.com` for redirect
  absorption only.
- **FR-008**: Any top-level navigation outside the allowlist MUST be cancelled in-app and opened in
  the user's default browser instead — including all non-Messenger Facebook destinations.
- **FR-009**: The allowlist check MUST be applied to every navigation hop, including server-issued
  redirects, so that a permitted first hop cannot carry the user to a non-permitted destination.
- **FR-010**: Subresource loads (images, media, scripts, styles, fonts, and network requests the page
  makes to render itself) MUST NOT be routed to the external browser and MUST NOT be blocked by the
  navigation rules.
- **FR-011**: Only `https`, `http`, `mailto`, and `tel` URLs MAY be handed to the operating system.
  Any other scheme MUST be discarded.
- **FR-012**: Back and Forward MUST refuse to navigate to a history entry outside the allowlist.

*Security impact*: This is the primary containment boundary. A flaw here turns the application into an
unrestricted browser carrying the user's live Messenger session — the highest-severity failure mode in
the product. Per-hop evaluation (FR-009) specifically closes the redirect-parameter bypass created by
allowing an authentication path.

#### C. Authentication and session

- **FR-013**: Sign-in MUST use Meta's own web authentication flow, completed inside the application.
  The application MUST NOT reimplement, proxy, script, or automate any part of it.
- **FR-014**: The application MUST persist exactly the web session state required to remain signed in,
  in its own private store, and MUST NOT create any additional copy, export, cache, or backup of it.
- **FR-015**: A signed-in session MUST survive application quit, relaunch, and system restart.
- **FR-016**: When the session becomes invalid, the application MUST present the sign-in flow rather
  than an error or blank state.
- **FR-017**: Clear Session Data MUST remove all stored session state after an explicit confirmation,
  and MUST return the application to a first-launch state.
- **FR-018**: The application MUST support exactly one account. No account switching, no second
  profile, no session export or import.

*Security impact*: The session store is the highest-value secret the application touches. Confining it
to a single private store with one documented deletion path minimises both exposure and the number of
places a session can leak from.

#### D. Popups and additional windows

- **FR-019**: New-window requests MUST be denied by default.
- **FR-020**: A new-window request whose URL is on the allowlist MAY open in a secondary application
  window that carries the identical security configuration and the same session as the main window.
- **FR-021**: A new-window request whose URL is not on the allowlist MUST NOT open a window and MUST
  be routed to the default browser instead.
- **FR-022**: Secondary windows MUST be transient — closable independently, and never a second main
  window or a second session.

*Security impact*: Popups are the classic bypass around a navigation allowlist. Routing them through
the same check with the same hardening is what prevents the popup path from becoming a weaker parallel
path. Constitutional Principle VIII ("one main window") is read here as one primary window and one
session; transient auxiliary windows required by the site's own flows do not constitute a second main
window.

#### E. Menus and keyboard shortcuts

- **FR-023**: The application MUST provide a native menu bar containing at minimum: Reload, Back,
  Forward, Zoom In, Zoom Out, Actual Size, Open Messenger Home, Clear Session Data, About, and Quit.
- **FR-024**: Standard macOS editing shortcuts (cut, copy, paste, select all, undo, redo) MUST work in
  the page's text fields.
- **FR-025**: *(REMOVED 2026-07-29 — identifier retained so FR-026 onward keep their numbers.)*
  In-page Find is out of scope for the MVP. Research R-011: `findInPage` searches only the rendered
  DOM, and because Messenger is a virtualised list it matches only what is currently scrolled into
  view — it cannot search a conversation, which is what a user pressing ⌘F wants, while Messenger's
  own search does. Find was also the sole requirement forcing application-owned chrome over the live
  page, costing a local shell view, one preload script, and seven IPC channels. Removing it yields a
  single-window architecture with **zero preloads and zero IPC**, eliminating the surface Principle II
  exists to constrain.
- **FR-026**: Zoom level MUST persist across launches.

*Security impact*: Editing shortcuts operate through the user's own explicit action on native menu
commands. This does not expose a clipboard API to the page and therefore does not conflict with
Principle II, which prohibits *exposing* clipboard access to remote content — not the user performing
a native paste. With Find removed (FR-025), the menu introduces no capability that reaches the remote
page at all: every item is either a native role or a main-process navigation command.

#### F. Permissions

- **FR-027**: All web-layer permission requests MUST be denied by default.
- **FR-028**: Exactly two permissions MAY be granted in the MVP, and only to the Messenger origin:
  **camera** and **microphone** (for voice and video calls). Notifications are deferred with FR-055
  and are not part of the MVP-approved permission set.
- **FR-029**: The application MUST declare the macOS camera and microphone usage purposes required for
  the system prompts to appear.
- **FR-030**: When macOS has denied camera or microphone access, the application MUST explain this and
  offer a route to the relevant System Settings pane. Notification permission handling is deferred.
- **FR-031**: Any permission type not in FR-028 — including any introduced by future platform
  versions — MUST be denied without prompting the user.

*Security impact*: Camera and microphone are the most invasive permissions in the MVP. Notifications
would additionally let the site put text of its own choosing in front of the user outside the
application window, so that capability remains deferred. Enumerating the permitted set as exactly two,
scoped to one origin, and denying unknown future permission types keeps the blast radius fixed as the
platform evolves.

*Constitutional note*: The constitution denies notifications by default and provides that only
permissions required by an approved capability may be allowed. FR-028 is the MVP-approved list;
notifications require a future capability specification and security review before they may be added.

#### G. Downloads

- **FR-032**: Every download MUST prompt the user for a save location via the standard macOS save
  panel.
- **FR-033**: Cancelling the save panel MUST write no file.
- **FR-034**: Downloads MUST NOT be opened or executed automatically on completion.
- **FR-035**: A site-suggested filename MUST NOT be able to cause a write outside the directory the
  user selected.

*Security impact*: The download path is where remote content becomes a local file. Requiring an
explicit user-chosen destination and refusing auto-open prevents a hostile attachment from being
written or run without a deliberate user action.

#### H. Errors and offline behaviour

- **FR-036**: When the page cannot load, the application MUST display an application-rendered error
  state describing what failed, with a Retry action.
- **FR-037**: The application MUST NOT display a blank window, hang indefinitely, or enter an
  unbounded reload loop on failure.
- **FR-038**: Automatic retries MUST be rate-limited.
- **FR-039**: No failure or recovery path may relax any security control.
- **FR-040**: When a navigation is refused by the allowlist in a context where the user expected to
  proceed (notably an unlisted authentication challenge), the application MUST say so explicitly
  rather than failing silently.

*Security impact*: Failing closed is the constitutional requirement. FR-039 exists because "just
disable the check to get the user unstuck" is the most likely shortcut a future maintainer will reach
for.

#### I. Identity and attribution

- **FR-041**: The product MUST ship as "MessengerBrowser".
- **FR-042**: The application icon and visual identity MUST NOT use or approximate Meta's marks,
  including Messenger's bolt-in-speech-bubble and Facebook's "f".
- **FR-043**: The About window MUST state the product name, version, and an explicit disclaimer of
  independence from and non-affiliation with Meta.

*Security impact*: None technical. Mitigates trademark risk per Principle XIII.

#### J. Security baseline (non-negotiable)

- **FR-044**: The remote page MUST NOT be given access to Node.js, the filesystem, shell or process
  execution, native modules, the Keychain, or unrestricted inter-process messaging.
- **FR-045**: Context isolation, the renderer sandbox, and web security MUST be enabled for every
  window and embedded view, without exception.
- **FR-046**: The application MUST NOT inject scripts or styles into the site, and MUST NOT depend on
  the site's markup structure, class names, or internal objects.
- **FR-047**: The application MUST NOT collect, inspect, transmit, or log message content, contacts,
  credentials, cookies, or tokens. No analytics, telemetry, or remote logging may exist.
- **FR-048**: The application MUST NOT contain advertising, tracking, message modification, or
  automation of user actions.
- **FR-049**: The application MUST NOT access Messenger through private, undocumented, or
  reverse-engineered interfaces, and MUST NOT attempt to circumvent Meta's authentication, security
  controls, rate limits, or site restrictions.
- **FR-050**: All application code MUST be written in a strictly type-checked language configuration,
  with the build failing on type errors.

*Security impact*: These are the controls that make everything above safe rather than merely
convenient. They are restated here so that acceptance testing covers them directly rather than
treating them as background assumptions.

#### K. Platform support and distribution

- **FR-051**: The application MUST run on Apple Silicon (arm64) Macs on the current major macOS
  release and the one immediately preceding it. As of this specification's date that means macOS 26
  (Tahoe) and macOS 15 (Sequoia); the concrete floor MUST be re-pinned when the next major macOS
  ships. The build is arm64-only — Intel Macs are not supported and no universal binary is produced.
- **FR-052**: The application MUST be distributed as a signed and notarized DMG, built with the
  Hardened Runtime enabled.
- **FR-053**: Entitlements MUST be the minimum required to run and use camera and microphone, and MUST
  be reviewed before release.
- **FR-054**: The DMG MUST install by drag-and-drop and launch without Gatekeeper warnings on a clean
  machine.

*Security impact*: Notarization and Hardened Runtime are the baseline macOS integrity guarantees.
Entitlement creep is the standard way Electron applications quietly give back the sandbox protection
they claim.

#### L. Notifications and application lifecycle

> **MVP deferral:** Site-delivered macOS notifications and the Dock badge are deferred from the
> MVP following Phase 0 observations. They remain future work and MUST be specified and reviewed
> together before implementation. The MVP continues to support the hide-not-destroy lifecycle,
> but does not promise notification delivery or a Dock badge.

- **FR-055**: DEFERRED. The application does not promise macOS message notifications in the MVP.
- **FR-056**: DEFERRED. The application does not promise a Dock unread badge in the MVP.
- **FR-057**: DEFERRED with FR-055. Notification click-to-focus is future work.
- **FR-058**: Closing the main window MUST NOT quit the application. The application MUST keep running
  until the user explicitly quits. Notification delivery is deferred from the MVP.
- **FR-059**: Reactivating the application when no window is open MUST reopen the main window with the
  existing session and saved geometry, with no re-authentication.
- **FR-060**: Quit MUST terminate the application fully.
- **FR-061**: Notification permission handling is deferred with FR-055 and is not an MVP behavior.

*Security impact*: Granting notifications lets the site deliver text of its own choosing to the system
notification centre — content the application forwards but never inspects, which keeps FR-047 intact.
Background running extends the lifetime of an authenticated session beyond the visible window: the
session remains resident and reachable whenever the application is running, which is the intended
behaviour but does mean closing the window is not a form of signing out. Clear Session Data (FR-017)
and Quit (FR-060) are the actions that end session availability. The unread badge is deliberately
constrained to a site-reported figure, because deriving it from page content would require the DOM
coupling that Principle VI prohibits.

#### M. Updates

- **FR-062**: Automatic update checking is OUT OF SCOPE for the MVP. The application MUST NOT contact
  any update server, and MUST NOT contain an auto-update mechanism.

*Security impact*: This resolves the user's conditional requirement ("only if it can be implemented
safely without delaying the MVP") in the negative, deliberately. An auto-updater is a remote code
execution channel into a signed application; doing it safely requires a signed update feed, key
management, and rollback handling, each needing its own security impact statement under Principle XII.
That is a larger surface than everything else in this MVP combined. Users update by downloading a new
DMG. See Assumptions for the deferred alternative.

### Key Entities

- **Session Store**: The private, application-owned store holding the web session state that keeps the
  user signed in. Exactly one exists. Created on first sign-in, destroyed by Clear Session Data. The
  application writes nothing into it directly and never reads its contents.
- **Window State**: Persisted size, position, and zoom level of the main window. Non-sensitive.
  Validated against the current display arrangement on restore.
- **Allowlist Entry**: A host pattern plus a path condition determining whether a navigation stays
  in-app. Grouped as Messenger surfaces, authentication surfaces, and redirect absorption. Defined in
  the constitution; extended only by amendment.
- **Navigation Request**: A single hop — user-activated link, script-initiated navigation, popup
  request, or server redirect — evaluated against the allowlist and resolved to allow, refuse, or
  route externally.
- **Download**: A file transfer initiated by the page, resolved to a user-chosen destination or
  cancelled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can go from opening the DMG to sending their first message in under 3
  minutes, including sign-in and two-factor verification.
- **SC-002**: 100% of sign-in attempts with valid credentials complete inside the application, with no
  step requiring an external browser.
- **SC-003**: A valid session survives 100% of quit/relaunch and restart cycles without
  re-authentication.
- **SC-004**: 100% of non-Messenger destinations — including non-Messenger Facebook pages, link shims,
  and redirect chains beginning at a permitted URL — open in the default browser and never in-app,
  verified against an enumerated test set including hostile look-alike hosts.
- **SC-005**: 100% of Messenger conversation and media links continue to open in-app.
- **SC-006**: Zero permissions beyond camera, microphone, and notifications are granted to the site,
  verified by attempting every permission type the platform offers.
- **SC-007**: Window size, position, and zoom are restored correctly on 100% of relaunches, including
  after a display configuration change.
- **SC-008**: No message content, credential, cookie, or token appears in any log, file, or network
  request the application itself originates — verified by inspecting all application-originated
  network traffic and all written files during a full session.
- **SC-009**: Every failure mode in the Edge Cases list produces a comprehensible on-screen
  explanation and a retry route; none produces a blank window, a hang, or a reload loop.
- **SC-010**: A voice call and a video call each complete successfully between two accounts after
  permissions are granted.
- **SC-011**: The application installs and launches on a clean, never-developed-on Mac with no
  Gatekeeper warning and no manual security override.
- **SC-012**: A user can fully remove their session in a single menu action, after which no trace of
  the prior session remains on disk.
- **SC-013**: DEFERRED. Notification delivery and notification click-to-focus will be measured in the
  future notification-and-badge phase.
- **SC-014**: DEFERRED. Dock-badge derivation will be specified and measured in the same future phase.
- **SC-015**: Closing the main window and reopening it from the Dock restores the session without
  re-authentication on 100% of attempts.

## Assumptions

- **Auto-update excluded, deliberately.** The user's requirement was conditional; it is resolved as
  out of scope because a safe update channel cannot be delivered without materially delaying the MVP.
  A later release may add a passive "Check for Updates" that opens a release page in the default
  browser — this carries none of the code-execution risk of a true auto-updater and is the intended
  follow-up.
- **The session store is treated as opaque.** The application creates it, points the web layer at it,
  and deletes it on request. It never parses or inspects its contents.
- **"One main window" permits transient auxiliary windows.** Popups required by the site's own sign-in
  and call flows are auxiliary, not a second main window, and share the single session.
- **Standard editing shortcuts are not "exposing the clipboard".** Principle II prohibits exposing
  clipboard access to the remote page; native menu commands invoked by the user are a different thing
  and are in scope.
- **In-page Find is removed** (FR-025). Users rely on Messenger's own search, which searches full
  conversation history rather than only the visible viewport. This removal is what permits the
  zero-preload, zero-IPC architecture.
- **Sign-in is assumed to traverse only the enumerated authentication paths.** Checkpoint and recovery
  flows have not yet been observed; see Dependencies.
- **The user has a working Messenger account and network connectivity.** The application does not
  provide account creation, recovery, or troubleshooting.
- **Background running is intended.** The application stays resident after the window closes. Closing
  the window is therefore not a form of signing out; only Quit and Clear Session Data end session
  availability. Notifications and the Dock badge are deferred from the MVP.
- **No launch-at-login and no menu bar item.** The application stays in the Dock when running. It does
  not add itself as a login item and does not present a menu bar extra — both were considered and are
  out of scope for the MVP.
- **No installer beyond drag-and-drop** — no package installer, no login item, no Sparkle-style
  update framework.

## Dependencies

> **Phase 0 feasibility spike is a blocking gate.** Two requirement groups below rest on
> assumptions never observed against the live site: authentication challenge paths (FR-013, FR-040),
> and calls and their permission origins (FR-028, User Story 6). [spike.md](./spike.md) must record a
> GO or GO-WITH-AMENDMENTS decision
> before production implementation begins. Amendments to this spec arising from the spike are the
> expected outcome, not a failure.

- **Meta's website remains functional and its URL structure stable.** The application has no fallback
  if the Messenger web experience is withdrawn.
- **Unresolved authentication paths.** Account checkpoint and password recovery flows may use paths
  not currently on the allowlist. These must be observed during implementation and added by
  constitutional amendment. Until then, a user hitting one of those flows will be blocked with an
  explanatory message (FR-040) rather than silently stuck.
- **Unresolved call surface.** Whether voice and video calls occur in-page or in a popup on a distinct
  path has not been confirmed. If calls use a path outside the current allowlist, that path must be
  identified and added by amendment before User Story 6 can pass. This is a known risk to FR-028 and
  SC-010.
- **Deferred notification-and-badge capability.** FR-055 through FR-057 and SC-013 through SC-014 are
  deferred from the MVP. Before implementation, the future phase must specify notification permission,
  site-delivered notification behavior, and any Dock-badge derivation together; Bell-count DOM
  extraction is not permitted without an explicit security and constitution amendment.
- **Apple Developer ID certificate and notarization credentials** are required before FR-052 can be
  satisfied and are not yet recorded.
- **Camera and microphone availability** depends on macOS system permissions the application can
  request but not grant.

## Out of Scope

Explicitly excluded from this release: multiple accounts or account switching; more than one primary
window; a custom or reimplemented Messenger client; any use of private or reverse-engineered Meta
interfaces; message search implemented by the application; message content storage, export, or backup;
analytics or telemetry of any kind; advertising; automation, scheduling, or auto-reply; themes,
custom CSS, or any modification of the site's appearance; in-page browser Find (FR-025); browser
extensions; Intel and universal
builds; Windows and Linux builds; Mac App Store distribution; auto-update; launch-at-login; a menu bar
extra or tray-only mode; notification content inspection, filtering, or muting rules.
