import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma client is generated code, not ours to lint.
    "generated/**",
  ]),
  {
    // shadcn/ui primitives are managed by the shadcn CLI, not edited by hand.
    files: ["components/ui/**"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Rule modules are pure input → output so both server and client can use
    // them and Vitest can test them without a DB. Add new rule modules here.
    files: [
      "lib/date.ts",
      "lib/geo.ts",
      "lib/holiday.ts",
      "lib/work-mode.ts",
      "lib/work-schedule.ts",
      "lib/**/*.test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/prisma",
                "./prisma",
                "@/generated/**",
                "**/generated/**",
                "@prisma/*",
                "@/servers/**",
                "@/lib/session",
                "@clerk/*",
              ],
              message:
                "Rule modules stay Prisma/DB/Clerk-free: take data as plain arguments instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
