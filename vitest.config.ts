import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    isolate: false,
    setupFiles: ['./test/setup.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'json-summary'],
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
