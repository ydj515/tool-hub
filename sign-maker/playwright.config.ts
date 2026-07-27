import { defineConfig, devices } from '@playwright/test';

// 포트는 앱마다 달라야 한다. reuseExistingServer 가 켜져 있어 같은 포트를
// 쓰면 먼저 뜬 다른 앱의 서버를 재사용해 엉뚱한 앱을 테스트하고, 그 증상이
// 플레이크로 오진된다.
// 4173 json-yaml-converter / 4174 openapi-editor / 4175 api-contract-test-generator
// 4176 config-diff-viewer / 4177 ddl-seed-generator / 4178 dummy-file-generator
// 4179 home / 4180 sign-maker
const PORT = 4180;

export default defineConfig({
  testDir: './e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001 },
  },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
