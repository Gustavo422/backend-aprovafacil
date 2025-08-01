import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, '..');

// Mapeamento de transformações para SQL
const SQL_TRANSFORMATIONS = {
  // Colunas de tabela
  'usuario_id UUID': 'usuario_id UUID',
  'usuario_id UUID NOT NULL': 'usuario_id UUID NOT NULL',
  'usuario_id UUID REFERENCES': 'usuario_id UUID REFERENCES',
  'usuario_id UUID NOT NULL REFERENCES': 'usuario_id UUID NOT NULL REFERENCES',
  
  // Constraints
  'usuario_id_fkey': 'usuario_id_fkey',
  'login_attempts_usuario_id_fkey': 'login_attempts_usuario_id_fkey',
  'refresh_tokens_usuario_id_fkey': 'refresh_tokens_usuario_id_fkey',
  'user_sessions_usuario_id_fkey': 'user_sessions_usuario_id_fkey',
  'audit_logs_usuario_id_fkey': 'audit_logs_usuario_id_fkey',
  'security_blocks_usuario_id_fkey': 'security_blocks_usuario_id_fkey',
  
  // Índices
  'idx_login_attempts_usuario_id': 'idx_login_attempts_usuario_id',
  'idx_refresh_tokens_usuario_id': 'idx_refresh_tokens_usuario_id',
  'idx_user_sessions_usuario_id': 'idx_user_sessions_usuario_id',
  'idx_audit_logs_usuario_id': 'idx_audit_logs_usuario_id',
  'idx_security_blocks_usuario_id': 'idx_security_blocks_usuario_id',
  
  // RLS Policies
  'usuario_id = auth.uid()': 'usuario_id = auth.uid()',
  
  // Comentários e strings
  'usuario_id': 'usuario_id',
  'usuario_id,': 'usuario_id,',
  'usuario_id DESC': 'usuario_id DESC',
};

// Arquivos de migration para refatorar
const MIGRATION_FILES = [
  'migrations/create_security_tables.sql',
  'migrations/003_fix_schema_consistency.sql'
];

function refactorSqlFile(filePath) {
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
    
    // Aplicar transformações SQL
    Object.entries(SQL_TRANSFORMATIONS).forEach(([oldPattern, newPattern]) => {
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

function validateSqlRefactoring() {
  console.log('\n🔍 Validando refatoração SQL...');
  
  const validationErrors = [];
  
  MIGRATION_FILES.forEach(filePath => {
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
      
      // Verificar sintaxe SQL básica
      const sqlKeywords = ['CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'SELECT'];
      const hasValidSql = sqlKeywords.some(keyword => content.includes(keyword));
      if (!hasValidSql) {
        validationErrors.push(`${filePath}: Possível problema de sintaxe SQL`);
      }
    }
  });
  
  if (validationErrors.length > 0) {
    console.log('\n⚠️  Problemas encontrados:');
    validationErrors.forEach(error => console.log(`  - ${error}`));
    return false;
  }
  
  console.log('✅ Validação SQL concluída com sucesso!');
  return true;
}

function createMigrationTransition() {
  console.log('\n📝 Criando migration de transição...');
  
  const transitionMigration = `-- Migration de transição: usuario_id -> usuario_id
-- Data: ${new Date().toISOString()}
-- Objetivo: Manter compatibilidade temporária durante refatoração

BEGIN;

-- 1. Adicionar colunas usuario_id onde não existem
DO $$ 
BEGIN
    -- login_attempts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'login_attempts' AND column_name = 'usuario_id') THEN
        ALTER TABLE public.login_attempts ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE;
    END IF;
    
    -- refresh_tokens
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'refresh_tokens' AND column_name = 'usuario_id') THEN
        ALTER TABLE public.refresh_tokens ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE;
    END IF;
    
    -- user_sessions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_sessions' AND column_name = 'usuario_id') THEN
        ALTER TABLE public.user_sessions ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE;
    END IF;
    
    -- audit_logs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'usuario_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
    END IF;
    
    -- security_blocks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_blocks' AND column_name = 'usuario_id') THEN
        ALTER TABLE public.security_blocks ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Migrar dados existentes
UPDATE public.login_attempts SET usuario_id = usuario_id WHERE usuario_id IS NULL AND usuario_id IS NOT NULL;
UPDATE public.refresh_tokens SET usuario_id = usuario_id WHERE usuario_id IS NULL AND usuario_id IS NOT NULL;
UPDATE public.user_sessions SET usuario_id = usuario_id WHERE usuario_id IS NULL AND usuario_id IS NOT NULL;
UPDATE public.audit_logs SET usuario_id = usuario_id WHERE usuario_id IS NULL AND usuario_id IS NOT NULL;
UPDATE public.security_blocks SET usuario_id = usuario_id WHERE usuario_id IS NULL AND usuario_id IS NOT NULL;

-- 3. Criar triggers para sincronização temporária
CREATE OR REPLACE FUNCTION sync_usuario_id_to_usuario_id()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.usuario_id IS NOT NULL THEN
            NEW.usuario_id = NEW.usuario_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers nas tabelas
DROP TRIGGER IF EXISTS sync_login_attempts_usuario_id ON public.login_attempts;
CREATE TRIGGER sync_login_attempts_usuario_id
    BEFORE INSERT OR UPDATE ON public.login_attempts
    FOR EACH ROW EXECUTE FUNCTION sync_usuario_id_to_usuario_id();

DROP TRIGGER IF EXISTS sync_refresh_tokens_usuario_id ON public.refresh_tokens;
CREATE TRIGGER sync_refresh_tokens_usuario_id
    BEFORE INSERT OR UPDATE ON public.refresh_tokens
    FOR EACH ROW EXECUTE FUNCTION sync_usuario_id_to_usuario_id();

DROP TRIGGER IF EXISTS sync_user_sessions_usuario_id ON public.user_sessions;
CREATE TRIGGER sync_user_sessions_usuario_id
    BEFORE INSERT OR UPDATE ON public.user_sessions
    FOR EACH ROW EXECUTE FUNCTION sync_usuario_id_to_usuario_id();

DROP TRIGGER IF EXISTS sync_audit_logs_usuario_id ON public.audit_logs;
CREATE TRIGGER sync_audit_logs_usuario_id
    BEFORE INSERT OR UPDATE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION sync_usuario_id_to_usuario_id();

DROP TRIGGER IF EXISTS sync_security_blocks_usuario_id ON public.security_blocks;
CREATE TRIGGER sync_security_blocks_usuario_id
    BEFORE INSERT OR UPDATE ON public.security_blocks
    FOR EACH ROW EXECUTE FUNCTION sync_usuario_id_to_usuario_id();

COMMIT;
`;

  const transitionPath = path.join(backendDir, 'migrations/004_usuario_id_transition.sql');
  fs.writeFileSync(transitionPath, transitionMigration, 'utf8');
  console.log(`📄 Migration de transição criada: ${transitionPath}`);
  
  return transitionPath;
}

function createRollbackScript(results) {
  const rollbackScript = `#!/usr/bin/env node
// Script de rollback para refatoração de migrations
// Gerado automaticamente em ${new Date().toISOString()}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, '..');

const ROLLBACK_FILES = ${JSON.stringify(results, null, 2)};

async function rollback() {
  console.log('🔄 Iniciando rollback da refatoração de migrations...');
  
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

  const rollbackPath = path.join(backendDir, 'scripts/rollback-migrations-refactor.js');
  fs.writeFileSync(rollbackPath, rollbackScript, 'utf8');
  console.log(`📄 Script de rollback criado: ${rollbackPath}`);
}

// Executar refatoração
console.log('🔄 Iniciando refatoração da camada de migrations...\n');

const results = [];
let totalChanges = 0;
let successCount = 0;
let errorCount = 0;

MIGRATION_FILES.forEach(filePath => {
  console.log(`📝 Refatorando: ${filePath}`);
  const result = refactorSqlFile(filePath);
  
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

// Criar migration de transição
const transitionPath = createMigrationTransition();

// Criar script de rollback
createRollbackScript(results);

// Validar refatoração
const validationSuccess = validateSqlRefactoring();

// Relatório final
console.log('\n📊 RELATÓRIO FINAL');
console.log('==================');
console.log(`✅ Arquivos processados com sucesso: ${successCount}`);
console.log(`❌ Arquivos com erro: ${errorCount}`);
console.log(`🔄 Total de mudanças aplicadas: ${totalChanges}`);
console.log(`🔍 Validação: ${validationSuccess ? 'PASSOU' : 'FALHOU'}`);

if (validationSuccess) {
  console.log('\n🎉 Refatoração da camada de migrations concluída com sucesso!');
  console.log('📋 Próximos passos:');
  console.log('   1. Executar migration de transição: 004_usuario_id_transition.sql');
  console.log('   2. Prosseguir para a próxima camada (repositories)');
  console.log('   3. Se necessário, usar o script de rollback');
} else {
  console.log('\n⚠️  Refatoração concluída com problemas!');
  console.log('📋 Ações recomendadas:');
  console.log('   1. Revisar erros de validação');
  console.log('   2. Executar rollback se necessário');
  console.log('   3. Corrigir problemas antes de prosseguir');
} 