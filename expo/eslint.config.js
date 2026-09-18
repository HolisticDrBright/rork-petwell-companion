const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Build output, not source: the web export bundles every dependency.
    ignores: ["dist/*", "dist-web/*", "test-results/*", "playwright-report/*"],
  },
]);
