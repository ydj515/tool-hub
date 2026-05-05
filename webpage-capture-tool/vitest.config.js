const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.js", "packages/**/*.test.mjs"],
  },
});
