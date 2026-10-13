import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  globalIgnores([
      "node_modules/**",
      ".next/**",
      ".next-studio-local/**",
      "output/**",
      ".local-tools/**",
      ".playwright-cli/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
  ]),
]);

export default eslintConfig;
