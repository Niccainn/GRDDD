import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Severity strategy (2026-04 cleanup pass):
 *
 *   ERROR (blocks CI):
 *     - rules-of-hooks: real runtime bugs
 *     - no-unused-expressions: usually indicates dead code
 *     - no-html-link-for-pages: breaks client-side nav
 *     - no-require-imports (in app code): TS should use import; build
 *       scripts under load/ and pitch/ are excluded below
 *
 *   WARN (visible but non-blocking):
 *     - no-unescaped-entities: stylistic; apostrophes in copy are fine
 *     - no-unused-vars: noisy, _-prefix escape hatch configured
 *     - no-explicit-any: real but we'll tighten gradually
 *     - react-compiler rules (purity, immutability, exhaustive-deps,
 *       refs, preserve-manual-memoization, set-state-in-effect): new
 *       React 19 rules we want visibility on but don't block ship
 *     - no-img-element: perf nudge; <img> is fine when we need it
 *
 * Loud but non-fatal lint is the right posture for a pre-PMF codebase
 * — every warning is a cleanup lead, but merge velocity beats a zero
 * warning count.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build + demo scripts that legitimately use CommonJS require()
    // and are not shipped to production.
    "load/**",
    "pitch/**",
    "prisma/seed.mjs",
    "scripts/**",
  ]),
  {
    rules: {
      // Stylistic / pre-PMF noise → warn, not error.
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-img-element": "warn",

      // React 19 compiler / purity rules — warn while we adopt.
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
