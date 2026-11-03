import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["supabase/tests/**/*.test.ts", "src/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
