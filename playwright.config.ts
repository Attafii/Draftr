import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"]] : [["list"]],
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 4321",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NVIDIA_API_KEY: "",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:4321",
      NEXT_PUBLIC_NVIDIA_MODEL: "test-model",
      NVIDIA_MODEL: "test-model",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});