const { test: base } = require("playwright/test");
const { _electron: electron } = require("playwright");
const path = require("path");

/**
 * Electron 앱 인스턴스를 각 테스트에 제공하는 픽스처.
 * electronApp, page 두 가지를 노출한다.
 */
const test = base.extend({
  electronApp: [
    async ({}, use) => {
      const appPath = path.resolve(__dirname, "../apps/electron/main.js");
      const app = await electron.launch({
        args: [appPath],
        env: { ...process.env, NODE_ENV: "test" },
      });
      await use(app);
      await app.close();
    },
    { scope: "test" },
  ],

  page: [
    async ({ electronApp }, use) => {
      const page = await electronApp.firstWindow();
      // 렌더러가 완전히 로드될 때까지 대기
      await page.waitForLoadState("domcontentloaded");
      await use(page);
    },
    { scope: "test" },
  ],
});

module.exports = { test, expect: base.expect };
