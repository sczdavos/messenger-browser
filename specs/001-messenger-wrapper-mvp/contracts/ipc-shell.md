# Contract: Main ↔ Shell IPC — **Option B only**

> **NOT USED IN THE RECOMMENDED ARCHITECTURE.** Research R-011 recommends Option A, which has **zero
> preload scripts and zero IPC channels**. This contract applies only if Find is restored to the MVP
> and the local shell architecture (Option B) is adopted. It is retained so that reviving Find does
> not require redesigning from scratch.
>
> Under Option A, none of the modules below exist, and the lint rules in
> [navigation-policy.md](./navigation-policy.md) §6b actively forbid a `preload` key anywhere in the
> codebase.

**Modules (Option B)**: `src/main/ipc/shell-channels.ts`, `src/shell/preload.ts`,
`src/shared/types.ts`

This would be the **entire** IPC surface of the application. It exists solely between the main
process and the *local* application shell view. It is never reachable from Messenger.

---

## Structural guarantee

| View | Loads | Preload | IPC reachable |
| --- | --- | --- | --- |
| `shellView` | `file://` local `index.html` | `src/shell/preload.ts` | yes — this contract |
| `contentView` | `https://www.facebook.com/…` | **none** | **no** |

The remote content view has no preload, so `ipcRenderer` does not exist in its world at all. Nothing
in this contract widens the remote page's capability, which is what keeps Principle II satisfied
structurally rather than by careful filtering.

An automated test asserts `contentView.webContents` was created with no `preload` and with
`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.

---

## Exposed API

`contextBridge.exposeInMainWorld('shellApi', …)`. Fixed, enumerated, no dynamic channel names, no
pass-through invoke.

```ts
interface ShellApi {
  // Find bar — shell → main
  findStart(query: string): void;
  findNext(): void;
  findPrevious(): void;
  findClose(): void;

  // Error state — shell → main
  retryLoad(): void;
  openSettingsPane(pane: 'camera' | 'microphone' | 'notifications'): void;

  // main → shell
  onStateChange(cb: (state: ShellUiState) => void): void;
}
```

That is the complete list. Six calls out, one subscription in.

---

## Channels

| Channel | Direction | Payload | Validation in main |
| --- | --- | --- | --- |
| `shell:find:start` | shell → main | `{ query: string }` | must be a string, length ≤ 200, else ignored |
| `shell:find:next` | shell → main | none | — |
| `shell:find:previous` | shell → main | none | — |
| `shell:find:close` | shell → main | none | — |
| `shell:retry-load` | shell → main | none | rate-limited, see below |
| `shell:open-settings` | shell → main | `{ pane: 'camera' \| 'microphone' \| 'notifications' }` | must be one of the three literals, else ignored |
| `shell:state` | main → shell | `ShellUiState` | — |

---

## Mandatory main-process validation

Every handler must, before acting:

1. **Verify the sender.** `event.senderFrame` must be the shell view's main frame. A message from any
   other `WebContents` is dropped. This holds even though the remote view has no preload — it is
   defence in depth against a future change that adds one.
2. **Validate the payload shape** against the table above. Anything unexpected is dropped silently
   rather than coerced.
3. **Never forward an argument to a native API.** `openSettingsPane` maps its three literals to three
   hard-coded `x-apple.systempreferences:` URLs; it does not construct a URL from input. Passing a
   caller-supplied string to `shell.openExternal` would be a local-execution vector.

`shell:open-settings` opens a fixed System Settings pane URL. These are the only non-http strings the
application ever hands to macOS, and they are constants in the source, never derived from input.

---

## Rate limiting

`shell:retry-load` is limited to one accepted retry per 2 seconds, with exponential backoff on
repeated failures (FR-038). This prevents a wedged error state from hammering the site.

---

## Prohibited additions

The following must never be added to this surface, and their presence fails the review gate:

- a generic `invoke(channel, ...args)` or `send(channel, ...args)` pass-through
- any channel that accepts a file path, a URL, or a shell command
- any channel that returns session data, cookies, or page content
- any channel reachable from the remote content view
- dynamically registered or wildcard channel names

---

## Required tests

- payload validation rejects wrong types, extra fields, and out-of-range values for every channel
- sender verification drops messages from a non-shell `WebContents`
- `openSettingsPane` with an invented pane string is ignored
- the exposed `shellApi` surface has exactly the seven documented members and no others
- `contentView` has no preload and no `ipcRenderer` in its world
