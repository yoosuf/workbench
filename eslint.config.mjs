// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.d.ts',
      // Manual verification/perf scripts run directly with tsx, not part of any package's
      // published build — not worth wiring into a tsconfig "include" just to lint them.
      'apps/api/test/**',
      'packages/*/test/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Backend (NestJS) — decorator-heavy, promise-heavy async code.
  {
    files: ['apps/api/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Nest resolvers/services routinely use `@Field(() => Type)` and DI parameter
      // properties without an explicit return type; the project doesn't otherwise enforce
      // this and it isn't worth the churn of annotating every method.
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // Frontend (React + Vite).
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      // Legitimate in this codebase for syncing local state from async query results / resetting
      // form state when a drawer opens. Fixing each properly means restructuring component data
      // flow with live browser verification per case, not a mechanical lint fix — kept as a
      // warning to flag new instances for review rather than block the build on existing ones.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  // Shared library packages — no framework-specific looseness, hold to a higher bar.
  {
    files: ['packages/*/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Formatting is Prettier's job, not ESLint's — must stay last to win over the configs above.
  eslintConfigPrettier,
);
