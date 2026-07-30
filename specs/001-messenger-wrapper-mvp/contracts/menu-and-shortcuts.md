# Contract: Application Menu, Shortcuts, and Lifecycle

**Modules**: `src/main/features/menu.ts`, `src/main/index.ts`

Implements FR-023 through FR-026 and FR-058 through FR-061.

---

## Menu structure

| Menu | Item | Shortcut | Role / action |
| --- | --- | --- | --- |
| MessengerBrowser | About MessengerBrowser | — | custom About window (FR-043) |
| | Clear Session Data… | — | confirm dialog, then clear (FR-017) |
| | Services | — | role `services` |
| | Hide / Hide Others / Show All | ⌘H / ⌥⌘H | standard roles |
| | Quit MessengerBrowser | ⌘Q | role `quit` — real termination (FR-060) |
| Edit | Undo / Redo | ⌘Z / ⇧⌘Z | roles `undo`, `redo` |
| | Cut / Copy / Paste / Select All | ⌘X / ⌘C / ⌘V / ⌘A | roles `cut`, `copy`, `paste`, `selectAll` |
| | ~~Find~~ | — | **Removed from the MVP** (FR-025). No ⌘F/⌘G binding ships |
| View | Reload | ⌘R | reload the remote window |
| | Open Messenger Home | ⇧⌘H | navigate to `https://www.facebook.com/messages` |
| | Actual Size / Zoom In / Zoom Out | ⌘0 / ⌘+ / ⌘- | zoom level, persisted (FR-026) |
| | Enter Full Screen | ⌃⌘F | role `togglefullscreen` |
| History | Back | ⌘[ | `navigationHistory.goBack()`, allowlist-gated |
| | Forward | ⌘] | `navigationHistory.goForward()`, allowlist-gated |
| Window | Minimise / Zoom / Close | ⌘M / — / ⌘W | roles; Close hides (see Lifecycle) |

**The Edit menu roles are load-bearing.** Without them, cut/copy/paste do not work inside the remote
page's text fields — this is the single most commonly missed requirement in Electron wrappers. They
satisfy FR-024 and do **not** conflict with Principle II: the constitution prohibits *exposing*
clipboard access to remote content, not the user invoking a native menu command. This reading is
recorded in the spec's Assumptions.

**No developer tools menu item ships in the release build.**

---

## Back / Forward gating

Back and Forward must not load a history entry outside the allowlist (FR-012). History entries can
predate a rule change, and a redirect can leave a non-allowlisted URL in history.

Implementation: read the target entry via `webContents.navigationHistory.getEntryAtIndex()`, run
`decide()` on its URL, and only call `goBack()`/`goForward()` on `allow-in-app`. Otherwise disable the
menu item. Enforcement layers 2–4 remain the backstop; this check is what makes the menu item
*correct* rather than merely blocked after the fact.

---

## Find — **REMOVED FROM THE MVP**

> Removed 2026-07-29 (FR-025, research R-011). The adopted Option A architecture ships no find bar,
> no shell view, and no ⌘F/⌘G binding. The mechanism below is retained only as a reference if Find is
> ever revived under Option B.

| Step | Mechanism |
| --- | --- |
| ⌘F | shell view expands to the find bar, focus moves to its input |
| type | `shell:find:start` → `contentView.webContents.findInPage(query)` |
| results | `found-in-page` → `{activeMatchOrdinal, matches}` → `shell:state` |
| ⌘G / ⇧⌘G | `findInPage(query, { findNext: true, forward: bool })` |
| Esc / close | `stopFindInPage('clearSelection')`, shell collapses to height 0 |

Uses the platform find facility only. No search code is injected into the page (Principle VI).

---

## Lifecycle

| Event | Behaviour | Requirement |
| --- | --- | --- |
| second launch | `requestSingleInstanceLock()`; loser exits, winner's `second-instance` shows and focuses the window, creating it if hidden | FR-004 |
| window `close` (⌘W, red button) | `preventDefault()` + `hide()` unless `isQuitting` | FR-058 |
| `before-quit` | set `isQuitting = true`, flush settings, then allow teardown | FR-060 |
| `activate` (Dock click, notification click) | show and focus the window | FR-057, FR-059 |
| `window-all-closed` | no-op — the window is hidden, never destroyed, so this does not fire in normal use | — |

**Why close hides rather than destroys**: notifications originate from the page's own Notification
API, which only runs while the remote `webContents` is alive. Destroying the window on close would
silently kill the capability FR-055 requires. This also makes FR-059 trivially correct — the page was
never torn down, so there is nothing to re-authenticate.

---

## Clear Session Data

1. `dialog.showMessageBox` — destructive confirmation, default button is Cancel.
2. On confirm: `clearStorageData()`, `clearCache()`, `clearAuthCache()`.
3. Reset badge to 0, reset zoom to default.
4. Navigate the remote window to `https://www.facebook.com/messages`, which now presents sign-in.

Cancel leaves everything intact (FR-017 scenario 2).

---

## Required tests

**Integration** (Playwright `_electron`): menu structure matches this contract; Open Messenger Home
navigates to the canonical URL; zoom persists across relaunch; Back/Forward are disabled when the
target entry fails `decide()`; closing the window leaves the app running and reopening from
`activate` restores it without re-authentication; second launch focuses rather than duplicating.

**Manual** (Playwright cannot intercept native dialogs — research R-009): the Clear Session Data
confirmation dialog; cut/copy/paste inside the remote page's text fields; the About window contents.
