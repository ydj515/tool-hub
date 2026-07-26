import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // 포트는 앱마다 달라야 한다. reuseExistingServer 가 켜져 있어 같은 포트를
  // 쓰면 먼저 뜬 다른 앱의 서버를 재사용해 엉뚱한 앱을 테스트한다.
  // json-yaml-converter 4173 / openapi-editor 4174 / 이 앱 4175.
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: !process.env.CI,
  },
});
