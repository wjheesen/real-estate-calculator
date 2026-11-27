import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4200';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  use: { baseURL, browserName: 'chromium', colorScheme: 'light', viewport: { width: 375, height: 812 } },
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4200',
    url: baseURL,
    timeout: 120_000,
  },
});
