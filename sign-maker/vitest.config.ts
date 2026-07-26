import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright 스펙은 vitest 가 수집하면 안 된다.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
