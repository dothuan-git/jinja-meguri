import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // `server-only`'s real default export throws outside React Server; stub it for tests.
      "server-only": fileURLToPath(new URL("./lib/test/server-only-stub.ts", import.meta.url)),
      // `next/cache` needs a Next runtime context; stub it so store.ts imports cleanly.
      "next/cache": fileURLToPath(new URL("./lib/test/next-cache-stub.ts", import.meta.url)),
    },
  },
});
