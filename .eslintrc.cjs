// .eslintrc.cjs
/**
 * ESLint configuration for the Career Track UI audit.
 * Extends recommended React/Next.js rules and provides placeholders for
 * design‑system specific rules (grid containers, typography, prohibited icons, etc.).
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  settings: { react: { version: "detect" } },
  rules: {
    // Design‑system rule placeholders – enable as needed.
    // "design/grid-container": "error",
    // "design/no-sparkle-icons": "error",
    // "design/button-geometry": "error",
  },
};
