import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Ignorar arquivos compilados e dependências
  {
    ignores: [
      "dist/**",
      "**/dist/**",
      "build/**",
      "**/build/**",
      "node_modules/**",
      "coverage/**"
    ]
  },

  // Configuração base para todos os arquivos JavaScript/TypeScript
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly"
      }
    },
    rules: {
      // Regras base do JavaScript
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-debugger": "error",
      "no-alert": "error",
      "no-eval": "error",
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "arrow-spacing": "error",
      // Permitir import separado de types e valores em TS
      "no-duplicate-imports": "off",
      // Várias expressões são usadas apenas por efeitos colaterais (ex.: encadeamento opcional)
      "no-unused-expressions": "warn",
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-dupe-else-if": "error",
      "no-duplicate-case": "error",
      "no-func-assign": "error",
      "no-import-assign": "error",
      "no-obj-calls": "error",
      "no-redeclare": "error",
      "no-sparse-arrays": "error",
      "no-undef": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
      "array-callback-return": "error",
      "consistent-return": "warn",
      "default-case-last": "error",
      "eqeqeq": "error",
      "no-caller": "error",
      "no-else-return": "warn",
      "no-empty-function": "warn",
      "no-eq-null": "error",
      "no-extra-bind": "error",
      "no-extra-label": "error",
      "no-floating-decimal": "error",
      "no-iterator": "error",
      "no-labels": "error",
      "no-lone-blocks": "error",
      "no-loop-func": "error",
      "no-multi-spaces": "error",
      "no-multi-str": "error",
      "no-new": "error",
      "no-new-wrappers": "error",
      "no-octal": "error",
      "no-octal-escape": "error",
      "no-proto": "error",
      "no-return-assign": "error",
      "no-self-assign": "error",
      "no-self-compare": "error",
      "no-sequences": "error",
      "no-throw-literal": "error",
      "no-unmodified-loop-condition": "error",
      "no-unused-labels": "error",
      "no-useless-call": "error",
      "no-useless-concat": "error",
      "no-useless-escape": "error",
      "no-useless-return": "error",
      // Permitir o operador void para indicar intenção de ignorar Promises
      "no-void": "off",
      "no-warning-comments": "warn",
      "prefer-promise-reject-errors": "error",
      // parseInt sem radix vira aviso
      "radix": "warn",
      // Muitos métodos async não precisam de await explícito
      "require-await": "off",
      "vars-on-top": "error",
      "wrap-iife": "error",
      "yoda": "error",
      "no-shadow": "warn",
      "no-shadow-restricted-names": "error",
      // Evitar erros por ordem de declaração em módulos TS
      "no-use-before-define": "warn",
      "camelcase": "off",
      // Algumas fábricas/nomes em maiúsculas não são construtores
      "new-cap": "off",
      "new-parens": "error",
      "no-array-constructor": "error",
      "no-new-object": "error",
      "no-new-require": "error",
      "no-path-concat": "error",
      "no-useless-constructor": "error",
      "prefer-arrow-callback": "warn",
      "prefer-spread": "error",
      "require-yield": "error",
      "sort-imports": "off",
      "sort-keys": "off",
      "sort-vars": "off",
      "unicode-bom": "error"
    }
  },

  // Configuração específica para arquivos .js (CommonJS)
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
        __dirname: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
      "no-new": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "warn"
    }
  },

  // Configuração específica para arquivos .cjs (CommonJS)
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        __dirname: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
      "no-new": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "warn",
      "no-use-before-define": "off",
      "no-return-assign": "off",
      "no-sequences": "off",
      "no-void": "off",
      "consistent-return": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-var": "off",
      "no-redeclare": "off"
    }
  },

  // Configuração específica para arquivos TypeScript
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,mts,cts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Regras específicas do TypeScript
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      // Tornar sugestões relacionadas a ?? e ?. como avisos
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unnecessary-condition": "warn",
      // Muitos loggers retornam Promises que não precisam ser aguardadas
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "error",
      // Handlers de frameworks podem retornar Promise
      "@typescript-eslint/no-misused-promises": "warn",
      // Nem todo método async precisa de await
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      // Tratar métodos desassociados como aviso
      "@typescript-eslint/unbound-method": "warn",
      // Alinhar com a base: expressões não usadas como aviso
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/prefer-includes": "error",
      "@typescript-eslint/prefer-string-starts-ends-with": "error",
      "@typescript-eslint/prefer-readonly": "warn",
      "@typescript-eslint/prefer-readonly-parameter-types": "off",
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/consistent-type-exports": "warn",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-indexed-object-style": "off",
      "@typescript-eslint/consistent-function-type-definitions": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/no-inferrable-types": "error",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      "@typescript-eslint/no-this-alias": "error",
      "@typescript-eslint/no-unnecessary-type-constraint": "error",
      "@typescript-eslint/no-unsafe-declaration-merging": "error",
      "@typescript-eslint/prefer-function-type": "error",
      "@typescript-eslint/prefer-reduce-type-parameter": "error",
      "@typescript-eslint/prefer-ts-expect-error": "error",
      // Não exigir async para toda função que retorna Promise
      "@typescript-eslint/promise-function-async": "off",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/restrict-plus-operands": "error",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/unified-signatures": "error"
    }
  },

  // Configuração para React (se houver arquivos JSX/TSX)
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react: pluginReact
    },
    ...pluginReact.configs.flat.recommended,
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "error",
      "react/no-unescaped-entities": "warn",
      "react/self-closing-comp": "error",
      "react/jsx-boolean-value": "error",
      "react/jsx-closing-bracket-location": "error",
      "react/jsx-closing-tag-location": "error",
      "react/jsx-curly-brace-presence": "error",
      "react/jsx-curly-spacing": "error",
      "react/jsx-equals-spacing": "error",
      "react/jsx-first-prop-new-line": "error",
      "react/jsx-indent": "off",
      "react/jsx-indent-props": "off",
      "react/jsx-key": "error",
      "react/jsx-max-props-per-line": "off",
      "react/jsx-no-bind": "warn",
      "react/jsx-no-comment-textnodes": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-literals": "off",
      "react/jsx-no-script-url": "error",
      "react/jsx-no-target-blank": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-pascal-case": "error",
      "react/jsx-props-no-multi-spaces": "error",
      "react/jsx-sort-default-props": "off",
      "react/jsx-sort-props": "off",
      "react/jsx-space-before-closing": "off",
      "react/jsx-tag-spacing": "error",
      "react/jsx-wrap-multilines": "error"
    }
  },

  // Configuração para arquivos de teste
  {
    files: ["**/*.test.{js,ts,jsx,tsx}", "**/*.spec.{js,ts,jsx,tsx}", "**/tests/**/*.{js,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly"
      }
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // Relaxar regras de async/await em testes
      "require-await": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-floating-promises": "off"
    }
  },

  // Configuração para arquivos de configuração
  {
    files: ["**/*.config.{js,ts,mjs,cjs}", "**/eslint.config.{js,ts,mjs,cjs}", "**/vitest.config.{js,ts,mjs,cjs}", "**/jest.config.{js,ts,mjs,cjs}"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  },

  // Configuração para scripts
  {
    files: ["**/scripts/**/*.{js,ts,mjs,cjs}"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // Em scripts permitimos variáveis não utilizadas como aviso
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "warn"
    }
  }
  ,
  // Override final para CommonJS/JS após configs do TS, garantindo que `require` e vars não usadas não quebrem o lint
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "warn"
    }
  }
]);
