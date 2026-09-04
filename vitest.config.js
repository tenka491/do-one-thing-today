import { defineConfig } from "vitest/config";

// Minimal, isolated from vite.config.js so the Vue/PWA plugins don't load for
// unit tests. stats.js and storage.js are plain modules; storage.test.js stubs
// the bits of the browser it needs.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
