#!/usr/bin/env node
// Script de rollback para refatoração de migrations
// Gerado automaticamente em 2025-07-28T00:59:12.618Z

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, '..');

const ROLLBACK_FILES = [
  {
    "success": true,
    "changes": 14,
    "errors": [],
    "backupPath": "D:\\AprovaFacil\\backend\\migrations\\create_security_tables.sql.backup",
    "file": "migrations/create_security_tables.sql"
  },
  {
    "success": true,
    "changes": 36,
    "errors": [],
    "backupPath": "D:\\AprovaFacil\\backend\\migrations\\003_fix_schema_consistency.sql.backup",
    "file": "migrations/003_fix_schema_consistency.sql"
  }
];

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
        console.log(`✅ Rollback: ${result.file}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Erro no rollback: ${result.file} - ${error.message}`);
        errorCount++;
      }
    }
  }
  
  console.log(`\n📊 Rollback concluído: ${successCount} sucessos, ${errorCount} erros`);
}

rollback().catch(console.error);
