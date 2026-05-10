const { defineConfig } = require("playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1, // Electron 앱은 병렬 실행 불가
  use: {
    headless: false, // Electron은 headless 미지원
  },
  reporter: [["list"]],
});
