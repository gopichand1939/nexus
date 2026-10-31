import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    screenshot: 'only-on-failure',
  },
});
