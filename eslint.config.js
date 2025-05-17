const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    files: ["**/*.ts"], // 檢查 .ts 檔案
    languageOptions: {
      parser: tsParser, // 用 TypeScript 的解析器
      sourceType: "module", // 支援 ES 模組
      globals: {
        ...globals.node, // Node.js 的全域變數（像 process）
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin, // TypeScript 專屬插件
      prettier: require("eslint-plugin-prettier"), // Prettier 插件
    },
    rules: {
      ...js.configs.recommended.rules, // ESLint 基本規則
      ...tsPlugin.configs.recommended.rules, // TypeScript 推薦規則
      ...prettier.rules, // 關掉跟 Prettier 衝突的規則
      "prettier/prettier": "error", // Prettier 格式錯誤會顯示
      semi: ["error", "always"], // 行尾一定要有分號
      quotes: ["error", "double"], // 用雙引號
      "no-var": "error", // 不准用 var
      "@typescript-eslint/no-unused-vars": ["error"], // 不准有沒用到的變數
      // 改用 TypeScript 版本的 func-style
      "func-style": ["error", "declaration", { allowArrowFunctions: true }],
      // 禁止一般函式表達式
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionExpression",
          message: "請使用函式宣告式或箭頭函式，避免使用一般函式表達式 😎",
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/__tests__/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.jest, // 加入 Jest 全域變數
      },
    },
  },
];
