import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  use: {
    trace: 'retain-on-failure',
  },
});
