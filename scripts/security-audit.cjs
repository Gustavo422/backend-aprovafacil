// Converted from ES Modules to CommonJS
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), 'backend', '.env') });

const fs = require('fs/promises');
const { validateEnvironment } = require('../dist/config/environment.js');
const { LogService } = require('../dist/core/utils/log.service.js');
const { supabase } = require('../dist/config/supabase-unified.js');
const { createClient } = require('@supabase/supabase-js');

const logger = new LogService(supabase, 'SecurityAudit');

/**
 * Procura por segredos hardcoded nos diretórios especificados.
 * @param {string[]} directories - Uma lista de diretórios para escanear.
 * @returns {Promise<string[]>} Uma lista de arquivos que contêm segredos potenciais.
 */
async function scanForSecrets(directories) {
  const secretsFound = [];
  const secretPattern = /([A-Za-z0-9_]+(KEY|SECRET|TOKEN|PASSWORD))[\s_]*=[\s_]*['"](.{16,})['"]/i;
  
  for (const dir of directories) {
    const files = await fs.readdir(dir, { recursive: true });
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = await fs.readFile(filePath, 'utf-8');
        if (secretPattern.test(content)) {
          secretsFound.push(filePath);
        }
      }
    }
  }
  return secretsFound;
}

/**
 * Verifica a consistência do schema do banco de dados.
 * Garante que não há colunas 'user_id' e que tabelas obsoletas foram removidas.
 */
async function checkSchemaConsistency() {
  const { data: userIdColumns, error: userIdError } = await supabase.rpc('execute_sql', {
    query: "SELECT table_schema, table_name, column_name FROM information_schema.columns WHERE column_name = 'user_id'"
  });

  if (userIdError) {
    throw new Error(`Erro ao verificar colunas 'user_id': ${userIdError.message}`);
  }

  if (userIdColumns && userIdColumns.length > 0) {
    const details = userIdColumns.map(c => `${c.table_schema}.${c.table_name}`).join(', ');
    throw new Error(`Encontrada(s) coluna(s) com nome 'user_id' que deveriam ter sido migradas para 'usuario_id'. Detalhes: ${details}`);
  }

  const { data: obsoleteTables, error: tablesError } = await supabase.rpc('execute_sql', {
    query: "SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_sessions', 'login_attempts', 'profiles')"
  });

  if (tablesError) {
    throw new Error(`Erro ao verificar tabelas obsoletas: ${tablesError.message}`);
  }

  if (obsoleteTables && obsoleteTables.length > 0) {
    const tables = obsoleteTables.map(t => t.table_name).join(', ');
    throw new Error(`Encontrada(s) tabela(s) obsoleta(s): ${tables}`);
  }
}

/**
 * Executa uma auditoria de segurança completa na aplicação.
 * 
 * 1. Valida variáveis de ambiente.
 * 2. (TODO) Procura por segredos hardcoded no código.
 * 3. (TODO) Verifica a consistência do schema do banco de dados.
 */
async function runSecurityAudit() {
  console.log('--- INICIANDO AUDITORIA DE SEGURANÇA ---');
  logger.info('Iniciando auditoria de segurança...');
  const projectRoot = path.resolve(__dirname, '..');

  try {
    // 1. Validar Variáveis de Ambiente
    console.log('[1/3] Validando variáveis de ambiente...');
    logger.info('[1/3] Validando variáveis de ambiente...');
    validateEnvironment();
    console.log('✅ Variáveis de ambiente validadas com sucesso.');
    logger.info('✅ Variáveis de ambiente validadas com sucesso.');

    // 2. Procurar por Segredos Hardcoded
    console.log('[2/3] Procurando por segredos hardcoded...');
    logger.info('[2/3] Procurando por segredos hardcoded...');
    const directoriesToScan = [
      path.join(projectRoot, 'src'),
      path.join(projectRoot, '..', 'frontend', 'src'),
    ];
    const filesWithSecrets = await scanForSecrets(directoriesToScan);
    if (filesWithSecrets.length > 0) {
      throw new Error(`Segredos encontrados em: ${filesWithSecrets.join(', ')}`);
    }
    console.log('✅ Nenhum segredo hardcoded encontrado.');
    logger.info('✅ Nenhum segredo hardcoded encontrado.');

    // 3. Verificar a consistência do schema
    console.log('[3/3] Verificando a consistência do schema do banco de dados...');
    logger.info('[3/3] Verificando a consistência do schema do banco de dados...');
    await checkSchemaConsistency();
    console.log('✅ Schema do banco de dados está consistente.');
    logger.info('✅ Schema do banco de dados está consistente.');
    
    console.log('--- AUDITORIA DE SEGURANÇA CONCLUÍDA COM SUCESSO ---');
    logger.info('Auditoria de segurança concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`🚨 AUDITORIA DE SEGURANÇA FALHOU: ${errorMessage}`);
    logger.erro(`🚨 Auditoria de segurança falhou: ${errorMessage}`, error, { service: 'security-audit' });
    process.exit(1);
  }
}

runSecurityAudit(); 