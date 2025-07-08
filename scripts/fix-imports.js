#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para processar um arquivo
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Regex para encontrar imports relativos sem extensão .js
    // Captura: import ... from './algo' ou import ... from '../algo'
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"](\.\.?\/[^'"]*?)['"]/g;
    
    let newContent = content.replace(importRegex, (match, importPath) => {
      // Se já tem extensão, não modifica
      if (importPath.endsWith('.js') || importPath.endsWith('.ts') || importPath.endsWith('.tsx')) {
        return match;
      }
      
      // Se termina com /, não adiciona extensão (é um diretório)
      if (importPath.endsWith('/')) {
        return match;
      }
      
      // Adiciona extensão .js
      modified = true;
      return match.replace(importPath, importPath + '.js');
    });
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Função para processar diretório recursivamente
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  let totalFixed = 0;
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Pula node_modules, dist, .git
      if (['node_modules', 'dist', '.git', 'coverage'].includes(item)) {
        continue;
      }
      totalFixed += processDirectory(fullPath);
    } else if (stat.isFile() && /\.(ts|js)$/.test(item)) {
      if (processFile(fullPath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

// Executar o script
console.log('🔧 Iniciando correção de imports...');
console.log('📁 Processando arquivos TypeScript/JavaScript...');

const srcPath = path.join(__dirname, '..', 'src');
const testsPath = path.join(__dirname, '..', 'tests');

let totalFixed = 0;

if (fs.existsSync(srcPath)) {
  totalFixed += processDirectory(srcPath);
}

if (fs.existsSync(testsPath)) {
  totalFixed += processDirectory(testsPath);
}

console.log(`\n✅ Concluído! ${totalFixed} arquivos foram corrigidos.`);
console.log('💡 Todos os imports relativos agora incluem a extensão .js'); 