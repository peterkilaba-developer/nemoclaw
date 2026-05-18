import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import unusedImports from 'eslint-plugin-unused-imports'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist/**',
    'node_modules/**',
    'functions/node_modules/**',
    '.firebase/**',
  ]),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      react,
      'unused-imports': unusedImports,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'error',
      'unused-imports/no-unused-imports': 'error',
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-empty': 'error',
      'no-shadow-restricted-names': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['functions/{index,twilio,aioBulk}.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-empty': 'error',
    },
  },
  {
    files: [
      'eslint.config.js',
      'vite.config.js',
      'scripts/activate_platform_agents.mjs',
      'scripts/prospect_research_backfill.mjs',
      'scripts/ralph_loop.mjs',
      'scripts/seedInternalAgents.mjs',
    ],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-empty': 'error',
    },
  },
])
