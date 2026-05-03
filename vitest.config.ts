import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    // HTML test-results report (pass/fail per test case)
    reporters: ['default', ['html', { outputFile: './reports/test-report.html' }]],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './reports/coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/tests/**', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
