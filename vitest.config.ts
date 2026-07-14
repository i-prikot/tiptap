import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    pool: 'threads',
    maxWorkers: 4,
    testTimeout: 10_000,
    isolate: true,
    setupFiles: ['./test/setup.ts'],
    exclude: ['e2e/**', '**/node_modules/**', '**/.git/**'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/main.ts',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
        'src/**/*.test.{ts,vue}',
        'src/**/*.spec.{ts,vue}',
        'test/**',
      ],
    },
  },
})
