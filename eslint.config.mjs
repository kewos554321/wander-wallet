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
  ]),
  // Test file overrides
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "@next/next/no-assign-module-variable": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/globals": "off",
    },
  },
]);

export default eslintConfig;
