# MessengerBrowser

MessengerBrowser is a security-hardened macOS wrapper around the official Facebook Messenger web
experience. It keeps Messenger focused in its own application window while routing non-Messenger
destinations to the system browser.

## Features

- Facebook Messenger at `facebook.com/messages`.
- Persistent sign-in session with an explicit Clear Session Data command.
- Strict navigation and permission allowlists.
- Voice and video calls using macOS camera and microphone permissions.
- Native save dialogs for downloads; downloaded files are never opened automatically.
- Native menus, zoom persistence, window-state persistence, and an About window.
- Apple Silicon (`arm64`) macOS package.

The application does not inject scripts, inspect message content, copy credentials or cookies, or
use private Messenger APIs.

## Installation

Download the latest `MessengerBrowser-*-arm64.dmg` from the GitHub Releases page, open it, and drag
MessengerBrowser to Applications.

The current testing builds are intentionally unsigned. On first launch, macOS may require
Control-clicking the application, choosing **Open**, and confirming **Open** in the warning dialog.
These builds are for a small testing group and require an Apple Silicon Mac running macOS 15 or
newer. Download only from the official GitHub Release and, when desired, verify the published
SHA-256 checksum before opening it.

If macOS reports that the application is “damaged” after downloading, this is the quarantine warning
for the unsigned app rather than a corrupt DMG. After copying MessengerBrowser to Applications,
remove the quarantine attribute and launch it:

```bash
xattr -dr com.apple.quarantine /Applications/MessengerBrowser.app
open /Applications/MessengerBrowser.app
```

Only do this for a DMG downloaded from the project’s official Release and verified against its
published checksum.

## Development

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:integration
npm start
```

Build the application bundle:

```bash
npm run package
```

Build the unsigned DMG:

```bash
npm run make
```

The DMG is written to `out/make/`. Build output, dependencies, test artifacts, and local tool
configuration are excluded from Git.

## Known limitations

- MessengerBrowser depends on Meta's current web client. Site changes can alter authentication,
  messaging, calls, or navigation paths.
- The unread Dock badge depends on a leading count in the document title. If Meta changes that
  title format, the badge disappears rather than inspecting page content.
- Native macOS notifications are unavailable in the current unsigned Electron 43 testing builds;
  Electron requires code signing for notification delivery. Signing and notarization are future
  release work.
- The application is arm64-only and has no automatic update mechanism.

## Security and privacy

Remote content runs without Node.js integration, preload scripts, or unrestricted IPC. Navigation,
permissions, popups, redirects, downloads, and session persistence are handled by the main process
under the project's allowlists and security policy.

## Distribution notes

For a signed release, configure:

- `MESSENGER_BROWSER_SIGNING_IDENTITY` for the Apple Developer ID identity.
- `MESSENGER_BROWSER_NOTARY_PROFILE` for the notarization Keychain profile.

Signed release verification, Gatekeeper validation, and clean-Mac installation testing remain
future/optional work for this testing phase.

## License

This repository is public, but no open-source license is currently granted (`UNLICENSED`).

## Disclaimer

This project is 100% AI-coded and provided for experimental and testing purposes. It is an
independent project and is not affiliated with, endorsed by, sponsored by, or otherwise connected
with Facebook, Messenger, or Meta Platforms, Inc.

Use this software at your own risk. It is provided without warranties of any kind. The authors and
contributors accept no responsibility or liability for data loss, account issues, privacy or
security incidents, service interruptions, system damage, or any other direct or indirect harm
resulting from its use, to the maximum extent permitted by applicable law. Review the code and
test it in an appropriate environment before relying on it.
