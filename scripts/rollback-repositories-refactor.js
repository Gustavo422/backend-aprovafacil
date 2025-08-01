#!/usr/bin/env node
// Script de rollback para refatoração de repositories
// Gerado automaticamente em 2025-07-28T01:00:16.784Z

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, '..');

const ROLLBACK_FILES = [
  {
    "success": true,
    "changes": 15,
    "errors": [],
    "backupPath": "D:\\AprovaFacil\\backend\\src\\repositories\\UserRepository.ts.backup",
    "file": "src/repositories/UserRepository.ts"
  },
  {
    "success": true,
    "changes": 6,
    "errors": [],
    "backupPath": "D:\\AprovaFacil\\backend\\src\\modules\\usuarios\\usuario.repository.ts.backup",
    "file": "src/modules/usuarios/usuario.repository.ts"
  }
];

async function rollback() {
  console.log('🔄 Iniciando rollback da refatoração de repositories...');
  
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
