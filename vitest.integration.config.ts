import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: 'integration',
      include: ['**/tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      setupFiles: ['./tests/integration/setup.ts'],
      testTimeout: 30000, // Increased timeout for integration tests
      hookTimeout: 30000,
      teardownTimeout: 30000,
      environmentMatchGlobs: [
        ['**/tests/integration/**', 'node']
      ],
      // Integration tests run sequentially to avoid conflicts
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
      // Add tags for filtering tests
      typecheck: {
        enabled: false, // Disable typecheck for integration tests
      }
    },
  })
);