import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.spec.{ts,tsx}'],
      setupFiles: ['./src/test-setup.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/features/**/domain/**/*.ts'],
        exclude: ['**/*.spec.ts', '**/ports.ts', '**/index.ts'],
        thresholds: { branches: 90, functions: 90, lines: 90 },
      },
    },
  }),
);
