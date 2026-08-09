import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["out/**", "node_modules/**"],
  },
  {
    files: ["extension-host/**/*.ts", "webview/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": "error",
    },
  },
  {
    files: ["webview/src/**/*.tsx"],
    ignores: ["webview/src/Ui/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement > JSXIdentifier[name=/^(input|button|select|textarea)$/]",
          message: "Intrinsic interactive elements are allowed only inside ui.",
        },
      ],
    },
  },
  {
    files: [
      "webview/src/View/EditorRoot/EditorSurface/ToolPane/**/*.tsx",
      "webview/src/View/EditorRoot/EditorSurface/EditPane/**/*.tsx",
    ],
    ignores: ["**/icons.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement > JSXIdentifier[name=/^[a-z]/]",
          message: "Chrome components must render through ui components, not intrinsic JSX.",
        },
      ],
    },
  },
  {
    files: ["**/icons.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXElement",
          message: "icons.ts files are descriptor catalogs and must not contain JSX.",
        },
        {
          selector: "JSXFragment",
          message: "icons.ts files are descriptor catalogs and must not contain JSX.",
        },
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\(|var\\(--/]",
          message: "icons.ts files must not contain color or CSS-variable literals.",
        },
      ],
    },
  },
];
