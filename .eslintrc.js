/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: undefined,
    ecmaVersion: 2020,
    sourceType: "module",
  },
  env: {
    node: true,
    es2021: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "max-lines-per-function": ["error", { max: 80 }],
    complexity: ["error", { max: 10 }],
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  ignorePatterns: [
    "dist/",
    "main.js",
    "node_modules/",
  ],
};