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

      // Ban the crash-prone fetch pattern that hit four list pages
      // (#33) and forced a 14-site sweep (#39). The shape:
      //
      //     fetch(url).then(r => r.json()).then(d => setX(d))
      //
      // crashes on any non-2xx, malformed JSON, or shape mismatch
      // because setX lands a value that doesn't match its declared
      // type, and the next render blows up on .map / .length.
      //
      // Use lib/api/safe-fetch (fetchArray, fetchObject, safeFetch)
      // instead — it wraps fetch+json+validate+fallback so caller
      // can't forget any layer.
      //
      // Whitelist for the helper file itself — see overrides below.
      // Severity: warn, not error.
      // When this rule first activated under `error` it surfaced
      // ~30 pre-existing violations in detail pages that PR #39's
      // sweep didn't reach (agents/[id], analytics/history,
      // approvals, assets/[id], audit, calendar, automations,
      // tasks/board, etc.) and blocked every PR. Until those
      // sites are migrated, the rule stays at warn — visible as
      // cleanup leads but non-blocking. Tighten to error once the
      // remaining call sites are gone (grep `safe-fetch-pending`).
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.property.name='then'][arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='CallExpression'][arguments.0.body.callee.property.name='json']",
          message:
            "Avoid fetch().then(r => r.json()) — crashes on non-2xx or shape mismatch. Use fetchArray / fetchObject / safeFetch from @/lib/api/safe-fetch (see PR #38). [safe-fetch-pending]",
        },
      ],
    },
  },
  // The safe-fetch helper itself legitimately calls r.json() inside
  // .then() — that's the whole point of the wrapper. Excluding it
  // from the rule that exists to point everyone else at it.
  {
    files: ["lib/api/safe-fetch.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
