import { defineConfig } from 'vitest/config'

export default defineConfig({
 test: {
  globals: true,
  environment: 'node',
  setupFiles: ['./vitest.setup.ts'],
  coverage: {
   enabled: true,
   exclude: [
    'node_modules/**',
    'dist/**',
    'coverage/**',
    '**/*.config.{js,ts,mjs}',
    '**/*.test.ts',
    'src/cli.ts', // Entry point, tested via integration
   ],
  },
 },
})
