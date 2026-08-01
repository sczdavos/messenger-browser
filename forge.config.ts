import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.messengerbrowser.app',
    appCopyright: 'Copyright © MessengerBrowser',
    name: 'MessengerBrowser',
    osxSign: {},
    extendInfo: {
      LSMinimumSystemVersion: '15.0.0',
      NSSupportsAutomaticGraphicsSwitching: true,
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
    packageAfterCopy: async (_config, buildPath) => {
      if (process.platform !== 'darwin') return;
      void buildPath;
    },
  },
};

export default config;
