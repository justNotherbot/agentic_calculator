import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const historyFile = join(tmpdir(), `calculator-client-${randomUUID()}.json`);
process.env.CLIENT_TEST_HISTORY_FILE = historyFile;

export default defineConfig({
  testDir: './client-tests',
  globalTeardown: './client-tests/teardown.js',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:8766',
    browserName: 'chromium',
    // The page loads CSS and Decimal from CDNs; no browser download is needed on this machine.
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  webServer: {
    command: 'node server.js',
    url: 'http://127.0.0.1:8766/',
    env: { PORT: '8766', HISTORY_FILE: historyFile },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
