import { defineConfig, devices } from '@playwright/test';

// 포트는 앱마다 달라야 한다. reuseExistingServer 가 켜져 있어 같은 포트를
// 쓰면 먼저 뜬 다른 앱의 서버를 재사용해 엉뚱한 앱을 테스트하고, 그 증상이
// 플레이크로 오진된다.
// 4173 json-yaml-converter / 4174 openapi-editor / 4175 api-contract-test-generator
// 4176 config-diff-viewer / 4177 ddl-seed-generator / 4178 dummy-file-generator
// 4179 home / 4180 sign-maker
const PORT = 4176;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Next.js 는 프로덕션 빌드로 검사한다(mise 의 test-e2e 가 build 에 의존한다).
    // app/page.tsx 가
    // dynamic(..., { ssr: false }) 를 쓰므로 dev 모드에서는 SSR 이 바일아웃하고
    // 청크가 요청 시점에 컴파일돼 헤드리스에서 클라이언트 렌더가 끝나지 않는다.
    command: `npm run start -- --port ${PORT}`,
    timeout: 180_000,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
