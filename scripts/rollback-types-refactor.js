#!/usr/bin/env node
// Script de rollback para refatoração de tipos
// Gerado automaticamente em 2025-07-28T00:58:23.858Z

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, '..');

const ROLLBACK_FILES = [
  {
    "success": true,
    "changes": 12,
    "errors": [],
    "backupPath": "D:\\AprovaFacil\\backend\\src\\types\\database.ts.backup",
    "file": "src/types/database.ts"
  },
  {
    "success": true,
    "changes": 20,
    "errors": [],
    "backupPath": "D:\\AprovaFacil\\backend\\src\\types\\database.types.ts.backup",
    "file": "src/types/database.types.ts"
  },
  {
    "success": true,
    "changes": 1,
    "errors": [],
    "backupPath": "D:\\AprovaFacil\\backend\\src\\shared\\types\\index.ts.backup",
    "file": "src/shared/types/index.ts"
  },
  {
    "success": true,
    "changes": 2,
    "errors": [],
    "backupPath": "D:\\AprovaFacil\\backend\\src\\types\\user-simulado-progress.dto.ts.backup",
    "file": "src/types/user-simulado-progress.dto.ts"
  }
];

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
