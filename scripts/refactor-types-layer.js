import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, '..');

// Mapeamento de transformações
const TRANSFORMATIONS = {
  // Campos de tabela
  'usuario_id: string': 'usuario_id: string',
  'usuario_id?: string': 'usuario_id?: string',
  'usuario_id: string | null': 'usuario_id: string | null',
  'usuario_id?: string | null': 'usuario_id?: string | null',
  
  // Parâmetros de função
  'p_usuario_id: string': 'p_usuario_id: string',
  'p_usuario_id: string | null': 'p_usuario_id: string | null',
  
  // Auth user ID (manter auth_usuario_id pois é específico do Supabase Auth)
  // 'auth_usuario_id': 'auth_usuario_id', // NÃO ALTERAR - é específico do Supabase
  
  // Comentários e strings
  'usuario_id': 'usuario_id',
  'usuario_id_fkey': 'usuario_id_fkey',
  'idx_usuario_id': 'idx_usuario_id',
};

// Arquivos de tipos para refatorar
const TYPE_FILES = [
  'src/types/database.ts',
  'src/types/database.types.ts',
  'src/shared/types/index.ts',
  'src/types/user-simulado-progress.dto.ts'
];

function refactorFile(filePath) {
  const fullPath = path.join(backendDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return { success: false, changes: 0, errors: [] };
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;
    let changes = 0;
    const errors = [];
    
    // Aplicar transformações
    Object.entries(TRANSFORMATIONS).forEach(([oldPattern, newPattern]) => {
      const regex = new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      
      if (matches) {
        content = content.replace(regex, newPattern);
        changes += matches.length;
        console.log(`  🔄 ${matches.length}x: "${oldPattern}" → "${newPattern}"`);
      }
    });
    
    // Verificar se houve mudanças
    if (content !== originalContent) {
      // Fazer backup
      const backupPath = fullPath + '.backup';
      fs.writeFileSync(backupPath, originalContent, 'utf8');
      
      // Salvar arquivo refatorado
      fs.writeFileSync(fullPath, content, 'utf8');
      
      console.log(`  ✅ ${filePath}: ${changes} mudanças aplicadas`);
      return { success: true, changes, errors, backupPath };
    } else {
      console.log(`  ℹ️  ${filePath}: Nenhuma mudança necessária`);
      return { success: true, changes: 0, errors: [] };
    }
    
  } catch (error) {
    console.error(`  ❌ Erro ao refatorar ${filePath}:`, error.message);
    return { success: false, changes: 0, errors: [error.message] };
  }
}

function validateRefactoring() {
  console.log('\n🔍 Validando refatoração...');
  
  const validationErrors = [];
  
  TYPE_FILES.forEach(filePath => {
    const fullPath = path.join(backendDir, filePath);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Verificar se ainda existem referências a usuario_id
      const remainingUserIds = content.match(/usuario_id/g);
      if (remainingUserIds) {
        validationErrors.push(`${filePath}: ${remainingUserIds.length} referências a usuario_id ainda existem`);
      }
      
      // Verificar se existem referências a usuario_id
      const usuarioIds = content.match(/usuario_id/g);
      if (usuarioIds) {
        console.log(`  ✅ ${filePath}: ${usuarioIds.length} referências a usuario_id encontradas`);
      }
    }
  });
  
  if (validationErrors.length > 0) {
    console.log('\n⚠️  Problemas encontrados:');
    validationErrors.forEach(error => console.log(`  - ${error}`));
    return false;
  }
  
  console.log('✅ Validação concluída com sucesso!');
  return true;
}

function createRollbackScript(results) {
  const rollbackScript = `#!/usr/bin/env node
// Script de rollback para refatoração de tipos
// Gerado automaticamente em ${new Date().toISOString()}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, '..');

const ROLLBACK_FILES = ${JSON.stringify(results, null, 2)};

async function rollback() {
  console.log('🔄 Iniciando rollback da refatoração de tipos...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const result of ROLLBACK_FILES) {
    if (result.backupPath) {
      try {
        const originalPath = result.backupPath.replace('.backup', '');
        fs.copyFileSync(result.backupPath, originalPath);
        fs.unlinkSync(result.backupPath);
        console.log(\`✅ Rollback: \${result.file}\`);
        successCount++;
      } catch (error) {
        console.error(\`❌ Erro no rollback: \${result.file} - \${error.message}\`);
        errorCount++;
      }
    }
  }
  
  console.log(\`\\n📊 Rollback concluído: \${successCount} sucessos, \${errorCount} erros\`);
}

rollback().catch(console.error);
`;

  const rollbackPath = path.join(backendDir, 'scripts/rollback-types-refactor.js');
  fs.writeFileSync(rollbackPath, rollbackScript, 'utf8');
  console.log(`📄 Script de rollback criado: ${rollbackPath}`);
}

// Executar refatoração
console.log('🔄 Iniciando refatoração da camada de tipos...\n');

const results = [];
let totalChanges = 0;
let successCount = 0;
let errorCount = 0;

TYPE_FILES.forEach(filePath => {
  console.log(`📝 Refatorando: ${filePath}`);
  const result = refactorFile(filePath);
  
  result.file = filePath;
  results.push(result);
  
  if (result.success) {
    successCount++;
    totalChanges += result.changes;
  } else {
    errorCount++;
  }
  
  console.log('');
});

// Criar script de rollback
createRollbackScript(results);

// Validar refatoração
const validationSuccess = validateRefactoring();

// Relatório final
console.log('\n📊 RELATÓRIO FINAL');
console.log('==================');
console.log(`✅ Arquivos processados com sucesso: ${successCount}`);
console.log(`❌ Arquivos com erro: ${errorCount}`);
console.log(`🔄 Total de mudanças aplicadas: ${totalChanges}`);
console.log(`🔍 Validação: ${validationSuccess ? 'PASSOU' : 'FALHOU'}`);

if (validationSuccess) {
  console.log('\n🎉 Refatoração da camada de tipos concluída com sucesso!');
  console.log('📋 Próximos passos:');
  console.log('   1. Executar testes para validar mudanças');
  console.log('   2. Prosseguir para a próxima camada (migrations)');
  console.log('   3. Se necessário, usar o script de rollback');
} else {
  console.log('\n⚠️  Refatoração concluída com problemas!');
  console.log('📋 Ações recomendadas:');
  console.log('   1. Revisar erros de validação');
  console.log('   2. Executar rollback se necessário');
  console.log('   3. Corrigir problemas antes de prosseguir');
} 