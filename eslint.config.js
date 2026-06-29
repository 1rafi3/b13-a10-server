export default [
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "semi": ["error", "always"],
      "quotes": ["error", "double", { "avoidEscape": true }],
      "no-unused-vars": ["warn"],
      "no-console": "off"
    }
  }
];
