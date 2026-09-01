import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e-live",
  use: { baseURL: "http://127.0.0.1:4176" },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4176",
    url: "http://127.0.0.1:4176",
    reuseExistingServer: false,
  },
});
