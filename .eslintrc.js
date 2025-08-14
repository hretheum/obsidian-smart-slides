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
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "max-lines-per-function": ["error", { max: 80 }],
    complexity: ["error", { max: 10 }],
    "no-console": ["warn", { allow: ["warn", "error"] }],
    // Enforce layered imports using import/no-restricted-paths
    "import/no-restricted-paths": ["error", {
      "zones": [
        { "target": "src/core", "from": "src/ui" },
        { "target": "src/security", "from": "src/ui" },
        { "target": "src/types", "from": "src/ui" },
        { "target": "src/types", "from": "src/core" },
        { "target": "src/security", "from": "src/core" }
      ]
    }],
  },
  ignorePatterns: [
    "dist/",
    "main.js",
    "node_modules/",
  ],
};