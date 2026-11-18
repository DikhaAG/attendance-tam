import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Test hanya untuk modul aturan domain yang bebas Prisma (`lib/work-schedule.ts`,
 * `lib/holiday.ts`, `lib/work-mode.ts`, …): input → output, tanpa DB/Clerk.
 */
export default defineConfig({
  resolve: {
    // Sama dengan `paths: { "@/*": ["./*"] }` di tsconfig.json.
    alias: [{ find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) }],
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
