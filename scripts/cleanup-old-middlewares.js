#!/usr/bin/env node

/**
 * Script para limpar middlewares antigos de autenticação
 * Remove os middlewares que foram substituídos pelo middleware unificado
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const middlewareDir = path.join(__dirname, '../src/middleware');

// Lista de middlewares antigos para remover
const oldMiddlewares = [
  'jwt-auth-global.ts',
  'enhanced-auth.middleware.ts',
  'simple-auth.js',
  'auth.ts',
  'auth-config.js'
];

// Lista de middlewares para manter
const keepMiddlewares = [
  'unified-auth.middleware.ts',
  'debug-request.js',
  'admin-auth.ts'
];

console.log('🧹 LIMPANDO MIDDLEWARES ANTIGOS DE AUTENTICAÇÃO');
console.log('=' .repeat(60));

let removedCount = 0;
let errorCount = 0;

// Verificar se o diretório existe
if (!fs.existsSync(middlewareDir)) {
  console.log('❌ Diretório de middlewares não encontrado:', middlewareDir);
  process.exit(1);
}

// Listar todos os arquivos no diretório
const files = fs.readdirSync(middlewareDir);

console.log('📁 Arquivos encontrados no diretório middleware:');
files.forEach(file => {
  if (oldMiddlewares.includes(file)) {
    console.log(`  ❌ ${file} (será removido)`);
  } else if (keepMiddlewares.includes(file)) {
    console.log(`  ✅ ${file} (será mantido)`);
  } else {
    console.log(`  ❓ ${file} (não está na lista)`);
  }
});

console.log('\n🗑️  Removendo middlewares antigos...');

// Remover middlewares antigos
oldMiddlewares.forEach(middleware => {
  const filePath = path.join(middlewareDir, middleware);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removido: ${middleware}`);
      removedCount++;
    } catch (error) {
      console.log(`❌ Erro ao remover ${middleware}:`, error.message);
      errorCount++;
    }
  } else {
    console.log(`⚠️  Arquivo não encontrado: ${middleware}`);
  }
});

// Verificar se há importações dos middlewares antigos no código
console.log('\n🔍 Verificando importações dos middlewares antigos...');

const srcDir = path.join(__dirname, '../src');
const filesToCheck = [
  'app.ts',
  'index.ts'
];

let importFound = false;

filesToCheck.forEach(file => {
  const filePath = path.join(srcDir, file);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    oldMiddlewares.forEach(middleware => {
      const middlewareName = middleware.replace('.ts', '').replace('.js', '');
      const importPattern = new RegExp(`import.*${middlewareName}`, 'g');
      
      if (importPattern.test(content)) {
        console.log(`⚠️  Importação encontrada em ${file}: ${middlewareName}`);
        importFound = true;
      }
    });
  }
});

// Verificar dependências no package.json
console.log('\n📦 Verificando dependências...');

const packageJsonPath = path.join(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Verificar se há scripts que referenciam middlewares antigos
  Object.entries(packageJson.scripts || {}).forEach(([scriptName, script]) => {
    oldMiddlewares.forEach(middleware => {
      const middlewareName = middleware.replace('.ts', '').replace('.js', '');
      if (script.includes(middlewareName)) {
        console.log(`⚠️  Script encontrado: ${scriptName} (referencia ${middlewareName})`);
        importFound = true;
      }
    });
  });
}

// Resumo final
console.log(`\n${ '=' .repeat(60)}`);
console.log('📊 RESUMO DA LIMPEZA:');
console.log(`✅ Middlewares removidos: ${removedCount}`);
console.log(`❌ Erros encontrados: ${errorCount}`);

if (importFound) {
  console.log('\n⚠️  ATENÇÃO: Foram encontradas referências aos middlewares antigos.');
  console.log('   Recomenda-se revisar e atualizar as importações manualmente.');
} else {
  console.log('\n✅ Nenhuma referência aos middlewares antigos foi encontrada.');
}

if (removedCount > 0) {
  console.log('\n🎉 Limpeza concluída com sucesso!');
  console.log('   O middleware unificado está pronto para uso.');
} else {
  console.log('\nℹ️  Nenhum middleware antigo foi removido.');
}

console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('1. Testar o middleware unificado: npm run test:auth');
console.log('2. Verificar se todas as rotas funcionam corretamente');
console.log('3. Atualizar documentação se necessário'); 