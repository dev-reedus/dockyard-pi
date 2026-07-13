import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Disable ESLint formatting rules that conflict with Prettier
  prettier,
  // TypeScript-specific rules for stricter type safety
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tsPlugin },
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
    },
    rules: {
      // Consistent type-only imports keep the bundle clean (avoids value imports for types)
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      // No unused variables — args prefixed with _ are intentionally ignored
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Disallow explicit `any` — use `unknown` and narrow instead
      '@typescript-eslint/no-explicit-any': 'error',
      // Prevent unhandled promise rejections, especially in Server Actions
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'agent/dist/**', 'next-env.d.ts']),
])

export default eslintConfig
