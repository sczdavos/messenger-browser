# MessengerBrowser

MessengerBrowser is an independent, security-hardened macOS window around the official Facebook
Messenger web experience. It injects no scripts, uses no Messenger selectors or private APIs, and
depends on Meta's web client remaining available.

## Known limitations

- Site changes can alter authentication, Messenger, call, or navigation paths. The application
  surfaces these as ordinary page failures or an explicit blocked-navigation message; new paths
  require a reviewed allowlist amendment.
- The unread badge depends on a leading count in the document title. If Meta changes that title
  format, the badge silently disappears rather than inspecting page content.
- Notifications are passed through from the site. MessengerBrowser does not read, filter, store,
  or synthesize notification content. Electron 43 requires a code-signed macOS app for native
  notifications; unsigned testing builds will not display them until signing is enabled.
- Calls depend on macOS camera and microphone permissions and Meta's current call surface.

## Development

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build:main
npm run test:integration
```

The packaged application is arm64-only. For the current small testing group, it is intentionally
distributed unsigned; macOS may require an explicit Open/Allow action on first launch. Apple
Developer signing, notarization, and clean-Mac Gatekeeper verification are future/optional release
work. When enabled, signing requires `MESSENGER_BROWSER_SIGNING_IDENTITY` and notarization requires
the Keychain profile named by `MESSENGER_BROWSER_NOTARY_PROFILE` (default: `messengerbrowser-notary`).

Electron 43 reaches end of life on 2027-01-05. Before shipping after that date, upgrade Electron,
rerun the security and integration suites, and complete a constitutional re-audit.
