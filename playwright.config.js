const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  timeout: 15000,
  webServer: {
    command: 'node tests/e2e/server.js',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 5000,
  },
  use: {
    baseURL: 'http://localhost:8080',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
