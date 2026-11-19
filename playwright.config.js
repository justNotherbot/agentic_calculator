import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/client',
  use: {
    baseURL: 'http://127.0.0.1:8000',
    browserName: 'chromium',
    launchOptions: { executablePath: '/usr/bin/google-chrome' },
  },
  webServer: {
    command: 'python3 -m http.server 8000 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
