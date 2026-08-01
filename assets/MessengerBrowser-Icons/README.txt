Messenger Browser — app icon assets
Design: rounded speech bubble with three typing dots, Liquid Glass (frosted), azure.

FILES
  MessengerBrowser.icns          macOS 26 (Tahoe) geometry — full-bleed 1024
                                 rounded square, no baked shadow. Use this one.
  MessengerBrowser-Legacy.icns   macOS 11-15 geometry — 824 artwork inset in a
                                 1024 canvas with a baked drop shadow.
  MessengerBrowser.iconset/      The 10 source PNGs behind the Tahoe .icns.
  MessengerBrowser-Legacy.iconset/  Same, legacy geometry.
  icon_1024_macos26.png          Master, full-bleed.
  icon_1024_legacy.png           Master, inset + shadow.

INSTALL — plain .app bundle
  1. Copy the .icns into YourApp.app/Contents/Resources/
  2. In Contents/Info.plist set:  <key>CFBundleIconFile</key><string>MessengerBrowser</string>
  3. Refresh the icon cache:  touch YourApp.app ; killall Dock

INSTALL — Xcode
  Drag MessengerBrowser.icns into the project and set it as the app icon, or
  drop the .iconset PNGs into an AppIcon asset set.

QUICK SWAP (no rebuild)
  Select the .app in Finder, Cmd-I, drag icon_1024_macos26.png onto the small
  icon in the top-left of the Info window.

REBUILD THE .ICNS YOURSELF (on macOS)
  iconutil -c icns MessengerBrowser.iconset

NOTES
  - Which to ship: on macOS 26 the system applies its own rounded-square mask and
    composites the shadow, so the full-bleed file is correct there. The legacy file
    avoids looking oversized on Sequoia and earlier. Ship the Tahoe one if you only
    target macOS 26.
  - For the full macOS 26 layered treatment (Default / Dark / Clear / Tinted
    rendering modes) you would rebuild this artwork in Apple's Icon Composer as a
    .icon file. The .icns here works everywhere without that.
  - Artwork is original. No Meta marks, no lightning-bolt glyph, and the hue is
    deliberately shifted off Facebook blue.
