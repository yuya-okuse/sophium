import { defineConfig } from "vitest/config"

// Keep Vitest from loading `.env.local` (e.g. sandboxed CI); unit tests are pure.
export default defineConfig({
  test: {
    environment: "node",
  },
  envDir: "/tmp",
})
