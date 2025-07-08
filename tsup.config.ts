import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: true,
  outDir: 'dist',
  minify: false, // Não minificar para facilitar debug
  treeshake: true,
  noExternal: ['zod'], // Incluir zod no bundle
  external: [
    // Dependências que não devem ser bundladas
    'express',
    'cors',
    'helmet',
    'morgan',
    'swagger-ui-express',
    'swagger-jsdoc',
    'dotenv',
    'compression',
    'express-rate-limit',
    '@supabase/supabase-js',
    'bcryptjs',
    'pg',
    'supertest',
    'openapi-types',
    'winston'
  ],
  onSuccess: 'echo "✅ Build concluído com sucesso!"',
}); 