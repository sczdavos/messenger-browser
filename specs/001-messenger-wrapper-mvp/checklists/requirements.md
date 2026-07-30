# Specification Quality Checklist: MessengerBrowser MVP

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-29
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Validation iteration 1 — 2026-07-29**: three `[NEEDS CLARIFICATION]` markers raised (macOS support
matrix, notifications scope, window-close behaviour). Two checklist items failed as a result.

**Validation iteration 2 — 2026-07-29**: all three resolved by the user. All items pass.

Resolutions:

1. **Platform (FR-051)** — Apple Silicon (arm64) only, current major macOS release plus the one
   preceding it (macOS 26 Tahoe and macOS 15 Sequoia as of this date). No universal binary. The
   version floor must be re-pinned when the next major macOS ships.
2. **Notifications (FR-055–FR-057)** — in scope, including the Dock unread badge. Added as User
   Story 5 (P2), with SC-013 and SC-014. Notification permission added to the approved permission
   set in FR-028.
3. **Lifecycle (FR-058–FR-061)** — closing the main window does not quit; the application stays
   resident and keeps delivering notifications until Quit. Added SC-015.

Structural verification: FR-001 through FR-062 are contiguous with no gaps or duplicates; ten user
stories are ordered by priority (P1 ×2, P2 ×3, P3 ×5); fifteen success criteria.

**Deliberately resolved without asking** (recorded in Assumptions, not raised as clarifications):

- Auto-update out of scope (FR-062). The user's requirement was explicitly conditional on not
  delaying the MVP, and a safe update channel cannot meet that condition. A passive "Check for
  Updates" that opens a release page is noted as the intended follow-up.
- "One main window" (constitution Principle VIII) read as permitting transient auxiliary popup
  windows required by the site's own sign-in and call flows.
- Native cut/copy/paste read as not conflicting with Principle II, which prohibits *exposing*
  clipboard access to the remote page rather than the user invoking a native menu command.
- Find specified to use the platform find facility, keeping it clear of the no-DOM-injection rule.
- No launch-at-login and no menu bar extra.

**Known risks carried into planning** (recorded under Dependencies, not blocking):

- **Authentication paths**: account checkpoint and password recovery flows may use paths not on the
  navigation allowlist. Users hitting them are blocked with an explanation (FR-040) until the paths
  are observed and added by constitutional amendment.
- **Call surface**: if voice/video calls open on a path outside the allowlist, User Story 6 and
  SC-010 cannot pass until that path is identified and added by amendment.
- **Unread badge**: FR-056 assumes the site exposes an unread count observably without inspecting
  page content. If it does not, the badge must be dropped rather than implemented by scraping
  (Principle VI). Notifications themselves are unaffected.

**Recommended follow-up** (not blocking): record the approved permission set (camera, microphone,
notifications) in the constitution alongside the navigation allowlist, so both live in one place.
Not strictly required — the constitution already provides for permissions granted by an approved
capability, and FR-028 is that approved list.

---

**Validation iteration 3 — 2026-07-29** (post-planning revision). All items still pass.

Changes since iteration 2:

1. **FR-025 removed; Find struck from FR-023.** Research R-011: `findInPage` searches only the
   rendered DOM, and Messenger is a virtualised list, so ⌘F would match only the visible viewport —
   it cannot search a conversation, while Messenger's own search can. Find was also the sole driver
   of the shell/preload/IPC architecture. The FR-025 identifier is **retained as removed** rather
   than renumbered, so FR-026 through FR-062 keep their numbers and all existing references stay
   valid. Requirement count is unchanged at 62 identifiers, 61 active.
2. **Architecture Option A adopted**: one `BrowserWindow`, zero preload scripts, zero IPC channels.
   Constitution deviations reduced from two to one (the title-derived badge).
3. **Phase 0 feasibility spike added as a blocking gate** ([spike.md](../spike.md)). Three
   requirement groups now explicitly rest on unverified assumptions and are gated: authentication
   challenge paths (FR-013, FR-040 — spike S-2), call permission origins (FR-028, User Story 6 —
   S-3/S-4/S-5), and notifications surviving a hidden window (FR-055, FR-058 — S-6/S-7).
4. **Consistency defects found and fixed** during the analysis pass: three broken cross-references to
   the superseded `navigation-allowlist.md`, and stale Find content in the menu contract.

**Note on "all functional requirements have clear acceptance criteria"**: this still passes, but the
acceptance criteria for FR-028, FR-055, and FR-058 are *conditional on spike findings*. If S-5 finds
a cross-origin RTC iframe, or S-6 finds that Chromium throttling suspends a hidden page, those
requirements need amending before they are implementable. That is the spike's purpose and is tracked
as GO-WITH-AMENDMENTS, the expected outcome.
