import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "development",
      JWT_SECRET: "test-secret-key",
      JWT_REFRESH_SECRET: "test-refresh-secret-key",
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
