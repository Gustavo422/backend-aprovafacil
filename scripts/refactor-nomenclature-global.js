#!/usr/bin/env node

/**
 * Script para refatoração global de nomenclatura
 * Converte todas as referências de user_id para usuario_id
 * Data: 2025-07-28
 * Objetivo: Garantir consistência de nomenclatura em todo o projeto
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(__dirname, '../../frontend');
const BACKUP_DIR = path.join(BACKEND_DIR, 'backups', 'nomenclature-refactor');

// Padrões de busca e substituição
const PATTERNS = [
  // user_id -> usuario_id
  {
    pattern: /\buser_id\b/g,
    replacement: 'usuario_id',
    description: 'user_id -> usuario_id'
  },
  // userId -> usuarioId
  {
    pattern: /\buserId\b/g,
    replacement: 'usuarioId',
    description: 'userId -> usuarioId'
  },
  // user_id_fkey -> usuario_id_fkey
  {
    pattern: /\buser_id_fkey\b/g,
    replacement: 'usuario_id_fkey',
    description: 'user_id_fkey -> usuario_id_fkey'
  },
  // idx_user_id -> idx_usuario_id
  {
    pattern: /\bidx_user_id\b/g,
    replacement: 'idx_usuario_id',
    description: 'idx_user_id -> idx_usuario_id'
  }
];

// Exceções - não alterar
const EXCEPTIONS = [
  'auth_user_id', // Específico do Supabase Auth
  'authUserId', // Específico do Supabase Auth
  'auth_usuario_id', // Já corrigido
  'authUsuarioId' // Já corrigido
];

// Extensões de arquivo para processar
const FILE_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx', '.json', '.sql'];

// Diretórios para ignorar
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'backups'
];

console.log('🔄 INICIANDO REFATORAÇÃO GLOBAL DE NOMENCLATURA');
console.log('=' .repeat(60));

// Criar diretório de backup
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('✅ Diretório de backup criado');
}

let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

/**
 * Verificar se o arquivo deve ser processado
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  if (!FILE_EXTENSIONS.includes(ext)) {
    return false;
  }

  // Verificar se está em diretório ignorado
  for (const ignoreDir of IGNORE_DIRS) {
    if (filePath.includes(ignoreDir)) {
      return false;
    }
  }

  return true;
}

/**
 * Verificar se a substituição deve ser feita
 */
function shouldReplace(text, match) {
  // Verificar exceções
  for (const exception of EXCEPTIONS) {
    if (text.includes(exception)) {
      return false;
    }
  }
  return true;
}

/**
 * Processar um arquivo
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let fileReplacements = 0;

    // Aplicar cada padrão
    for (const pattern of PATTERNS) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          if (shouldReplace(content, match)) {
            modifiedContent = modifiedContent.replace(pattern.pattern, pattern.replacement);
            fileReplacements++;
          }
        }
      }
    }

    // Se houve mudanças, salvar arquivo
    if (modifiedContent !== content) {
      // Criar backup
      const relativePath = path.relative(BACKEND_DIR, filePath);
      const backupPath = path.join(BACKUP_DIR, relativePath);
      const backupDir = path.dirname(backupPath);
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      fs.copyFileSync(filePath, backupPath);
      
      // Salvar arquivo modificado
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      
      modifiedFiles++;
      totalReplacements += fileReplacements;
      
      console.log(`✅ ${relativePath} (${fileReplacements} substituições)`);
    }

    totalFiles++;
  } catch (error) {
    console.log(`❌ Erro ao processar ${filePath}: ${error.message}`);
  }
}

/**
 * Processar diretório recursivamente
 */
function processDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        processDirectory(itemPath);
      } else if (stat.isFile()) {
        if (shouldProcessFile(itemPath)) {
          processFile(itemPath);
        }
      }
    }
  } catch (error) {
    console.log(`❌ Erro ao processar diretório ${dirPath}: ${error.message}`);
  }
}

/**
 * Verificar se há referências restantes
 */
function checkRemainingReferences() {
  console.log('\n🔍 Verificando referências restantes...');
  
  const remainingPatterns = [
    /\buser_id\b/g,
    /\buserId\b/g,
    /\buser_id_fkey\b/g,
    /\bidx_user_id\b/g
  ];
  
  let remainingCount = 0;
  
  function checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const pattern of remainingPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Verificar se não é uma exceção
            let isException = false;
            for (const exception of EXCEPTIONS) {
              if (content.includes(exception)) {
                isException = true;
                break;
              }
            }
            
            if (!isException) {
              remainingCount++;
              console.log(`⚠️  Referência restante em ${path.relative(BACKEND_DIR, filePath)}: ${match}`);
            }
          }
        }
      }
    } catch (error) {
      // Ignorar erros de leitura
    }
  }
  
  function checkDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && !IGNORE_DIRS.includes(item)) {
          checkDirectory(itemPath);
        } else if (stat.isFile() && shouldProcessFile(itemPath)) {
          checkFile(itemPath);
        }
      }
    } catch (error) {
      // Ignorar erros de leitura
    }
  }
  
  checkDirectory(BACKEND_DIR);
  
  if (remainingCount === 0) {
    console.log('✅ Nenhuma referência restante encontrada!');
  } else {
    console.log(`⚠️  ${remainingCount} referências restantes encontradas`);
  }
}

/**
 * Executar refatoração
 */
async function runRefactoring() {
  console.log('📁 Processando arquivos do backend...');
  processDirectory(BACKEND_DIR);
  
  console.log('\n📁 Processando arquivos do frontend...');
  if (fs.existsSync(FRONTEND_DIR)) {
    processDirectory(FRONTEND_DIR);
  } else {
    console.log('⚠️  Diretório frontend não encontrado');
  }
  
  console.log(`\n${ '=' .repeat(60)}`);
  console.log('📊 RESUMO DA REFATORAÇÃO:');
  console.log(`📁 Arquivos processados: ${totalFiles}`);
  console.log(`✅ Arquivos modificados: ${modifiedFiles}`);
  console.log(`🔄 Total de substituições: ${totalReplacements}`);
  
  if (modifiedFiles > 0) {
    console.log(`💾 Backup salvo em: ${BACKUP_DIR}`);
  }
  
  // Verificar referências restantes
  checkRemainingReferences();
  
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Executar testes para verificar se tudo funciona');
  console.log('2. Verificar se não há quebras de funcionalidade');
  console.log('3. Executar migrações se necessário');
  console.log('4. Atualizar documentação');
  
  if (modifiedFiles > 0) {
    console.log('\n🎉 REFATORAÇÃO CONCLUÍDA COM SUCESSO!');
  } else {
    console.log('\nℹ️  Nenhum arquivo foi modificado');
  }
}

// Executar refatoração
runRefactoring().catch(error => {
  console.error('❌ Erro durante a refatoração:', error);
  process.exit(1);
}); 