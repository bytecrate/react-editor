export default [
  {
    ignores: ["dist/", "node_modules/"]
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      // Add basic rules or extend from recommended configs here later if needed
    }
  }
];
