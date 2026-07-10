import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

const ignoredVariablePattern = '^_'

export default [
  {
    name: 'project/ignores',
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.vite/**',
      '.npm-cache/**',
      '.ai-factory/**',
      '.claude/**',
      '.codex/**',
      '.opencode/**',
      'public/**',
      '*.local',
      '.env',
      '.env.*',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],

  {
    name: 'project/source-options',
    files: ['src/**/*.{ts,vue}', 'vite.config.ts', 'vitest.config.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
    },
  },

  {
    name: 'project/typescript',
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: ignoredVariablePattern,
          caughtErrorsIgnorePattern: ignoredVariablePattern,
          destructuredArrayIgnorePattern: ignoredVariablePattern,
          varsIgnorePattern: ignoredVariablePattern,
        },
      ],
    },
  },

  {
    name: 'project/vue',
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: ignoredVariablePattern,
          caughtErrorsIgnorePattern: ignoredVariablePattern,
          destructuredArrayIgnorePattern: ignoredVariablePattern,
          varsIgnorePattern: ignoredVariablePattern,
        },
      ],
      'vue/multi-word-component-names': 'off',
    },
  },

  {
    name: 'project/runtime-diagnostics',
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-control-regex': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/require-default-prop': 'off',
      'vue/html-self-closing': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  eslintConfigPrettier,
]
