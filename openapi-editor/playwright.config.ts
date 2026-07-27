import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001 } },
  use: { baseURL: 'http://127.0.0.1:4174', trace: 'on-first-retry' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4174', url: 'http://127.0.0.1:4174', reuseExistingServer: !process.env.CI },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
