import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
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
      'playwright-report/**',
      'test-results/**',
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
    files: [
      'packages/**/*.{ts,vue}',
      'apps/**/*.{ts,vue}',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
    ],
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
      'vue/no-side-effects-in-computed-properties': 'error',
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

  {
    name: 'project/node-commonjs-scripts',
    files: ['scripts/**/*.cjs', '{apps,packages}/**/scripts/**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  {
    name: 'project/node-esm-scripts',
    files: ['scripts/**/*.mjs', '{apps,packages}/**/scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },

  {
    name: 'project/node-cli-output',
    files: ['scripts/**/*.{cjs,mjs}', '{apps,packages}/**/scripts/**/*.{cjs,mjs}'],
    rules: {
      'no-console': ['warn', { allow: ['log', 'table', 'warn', 'error'] }],
    },
  },

  {
    name: 'project/vite-config-output',
    files: ['vite.config.ts', '{apps,packages}/**/vite.config.ts'],
    rules: {
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    },
  },

  {
    name: 'project/editor-layer-boundaries',
    files: ['packages/{schema,editor}/src/**/*.{ts,vue}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: [
            './packages/schema/tsconfig.json',
            './packages/editor/tsconfig.json',
            './apps/playground/tsconfig.json',
          ],
        },
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './packages/schema/src',
              from: './packages/editor/src',
              message:
                'The schema workspace must not depend on Vue editor code. Use schema APIs or dependency inversion instead.',
            },
          ],
        },
      ],
    },
  },

  eslintConfigPrettier,
]
