import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { resolve } from 'node:path';

const signingIdentity = process.env.MESSENGER_BROWSER_SIGNING_IDENTITY;
const notaryProfile = process.env.MESSENGER_BROWSER_NOTARY_PROFILE;

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.messengerbrowser.app',
    appCopyright: 'Copyright © MessengerBrowser',
    name: 'MessengerBrowser',
    icon: resolve('assets/MessengerBrowser-Icons/MessengerBrowser.icns'),
    extraResource: ['src/renderer-static'],
    ...(signingIdentity
      ? {
          osxSign: {
            identity: signingIdentity,
            optionsForFile: () => ({
              entitlements: 'build/entitlements.mac.plist',
              hardenedRuntime: true,
            }),
          },
        }
      : {}),
    ...(notaryProfile
      ? { osxNotarize: { keychainProfile: notaryProfile } }
      : {}),
    extendInfo: {
      LSMinimumSystemVersion: '15.0.0',
      NSSupportsAutomaticGraphicsSwitching: true,
      NSCameraUsageDescription:
        'MessengerBrowser uses the camera for Facebook Messenger video calls.',
      NSMicrophoneUsageDescription:
        'MessengerBrowser uses the microphone for Facebook Messenger calls.',
    },
  },
  rebuildConfig: {},
  makers: [new MakerDMG({})],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
        },
      ],
      renderer: [],
    }),
  ],
  hooks: {
    packageAfterCopy: async (
      _config,
      _buildPath,
      _electronVersion,
      _platform,
      arch,
    ) => {
      if (arch !== 'arm64') {
        throw new Error('MessengerBrowser supports arm64 packaging only.');
      }
    },
  },
};

export default config;
