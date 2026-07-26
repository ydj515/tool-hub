const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.js",
      "packages/**/*.test.mjs",
      "apps/**/*.test.mjs",
      // 정본 drift 테스트(styles/ds-sync.test.ts)가 .ts 다. 이 앱에는
      // typescript 도 tsconfig 도 없지만 vitest 의 esbuild 가 변환한다.
      "apps/**/*.test.ts",
    ],
  },
});
