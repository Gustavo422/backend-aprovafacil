import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    },
    // Desativando completamente o UI para evitar problemas de porta
    ui: false,
    // Configuração para evitar problemas de permissão
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});