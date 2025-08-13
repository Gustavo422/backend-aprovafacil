#!/usr/bin/env node
 
// Exporta o OpenAPI gerado em runtime para um arquivo estático openapi.json na raiz do backend
const { join } = require('path');
const { writeFileSync } = require('fs');
const { pathToFileURL } = require('url');

(async () => {
  try {
    // Preferir fonte TS por padrão para refletir alterações recentes sem precisar de build
    // Use OPENAPI_USE_DIST=1 para forçar uso do build
    const distPath = join(__dirname, '..', 'dist', 'src', 'core', 'documentation', 'openapi.js');
    const preferDist = process.env.OPENAPI_USE_DIST === '1';
    let mod;
    if (!preferDist) {
      try {
        // Transpilar on-the-fly com ts-node
         
        require('ts-node').register({ transpileOnly: true, esm: true, compilerOptions: { module: 'CommonJS' } });
         
        mod = require('../src/core/documentation/openapi.ts');
      } catch (e) {
        // fallback para build
        mod = await import(pathToFileURL(distPath).href);
      }
    } else {
      // Forçar uso do build
      mod = await import(pathToFileURL(distPath).href);
    }
    const generateOpenAPISpec = mod?.generateOpenAPISpec ?? mod?.default?.generateOpenAPISpec;

    if (typeof generateOpenAPISpec !== 'function') {
      console.error('❌ Não foi possível carregar generateOpenAPISpec do build. Rode "npm run build".');
      process.exit(1);
    }

    const spec = generateOpenAPISpec();
    const outPath = join(__dirname, '..', 'openapi.json');
    writeFileSync(outPath, JSON.stringify(spec, null, 2), 'utf-8');
    console.log('✅ OpenAPI exportado em', outPath);
  } catch (error) {
    console.error('❌ Erro ao exportar OpenAPI:', error && error.message ? error.message : error);
    process.exit(1);
  }
})();


