import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Carga apps/web/.env si existe (por ejemplo, para apuntar a otro Postgres local).
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.int-spec.ts'],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
