#!/usr/bin/env node

/**
 * Script para refatorar usuario_id -> usuario_id na camada de Services
 * Data: 2025-07-28T01:20:00.000Z
 * Objetivo: Refatorar referências usuario_id para usuario_id em arquivos de serviços
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const BACKEND_DIR = path.join(__dirname, '..');
const SERVICES_DIR = path.join(BACKEND_DIR, 'src', 'services');
const BACKUP_DIR = path.join(BACKEND_DIR, 'backups', 'services-refactor');

// Padrões de busca e substituição para Services
const PATTERNS = [
    // Parâmetros de função
    {
        pattern: /(\s+)usuario_id(\s*:\s*[^,)]+)/g,
        replacement: '$1usuario_id$2',
        description: 'Parâmetros de função usuario_id -> usuario_id'
    },
    // Propriedades de objeto
    {
        pattern: /(\s+)usuario_id(\s*:\s*[^,}\n]+)/g,
        replacement: '$1usuario_id$2',
        description: 'Propriedades de objeto usuario_id -> usuario_id'
    },
    // Referências em queries ou filtros
    {
        pattern: /(\s+)usuario_id(\s*[=<>!])/g,
        replacement: '$1usuario_id$2',
        description: 'Referências em queries usuario_id -> usuario_id'
    },
    // Comentários (opcional)
    {
        pattern: /(\/\/\s*)(usuario_id)(\s*[:=])/g,
        replacement: '$1usuario_id$3',
        description: 'Comentários usuario_id -> usuario_id'
    }
];

// Função para criar backup
function createBackup(filePath) {
    const relativePath = path.relative(BACKEND_DIR, filePath);
    const backupPath = path.join(BACKUP_DIR, relativePath);
    const backupDir = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Backup criado: ${relativePath}`);
}

// Função para refatorar arquivo
function refactorFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let changes = 0;
    
    console.log(`\n📁 Processando: ${path.relative(BACKEND_DIR, filePath)}`);
    
    // Aplicar cada padrão
    PATTERNS.forEach(({ pattern, replacement, description }) => {
        const matches = newContent.match(pattern);
        if (matches) {
            newContent = newContent.replace(pattern, replacement);
            changes += matches.length;
            console.log(`  🔄 ${description}: ${matches.length} mudanças`);
        }
    });
    
    if (changes > 0) {
        // Criar backup antes de modificar
        createBackup(filePath);
        
        // Salvar arquivo modificado
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`  ✅ Total de mudanças: ${changes}`);
        return changes;
    } else {
        console.log(`  ⏭️  Nenhuma mudança necessária`);
        return 0;
    }
}

// Função para validar arquivo
function validateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const userIdMatches = content.match(/usuario_id/g);
    
    if (userIdMatches) {
        console.log(`  ⚠️  AINDA EXISTEM ${userIdMatches.length} referências a usuario_id`);
        return false;
    }
    
    console.log(`  ✅ Validação passou - todas as referências foram refatoradas`);
    return true;
}

// Função principal
function main() {
    console.log('🔄 Iniciando refatoração da camada Services...\n');
    
    // Criar diretório de backup
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    let totalChanges = 0;
    let processedFiles = 0;
    let validatedFiles = 0;
    
    // Processar arquivos de serviços
    if (fs.existsSync(SERVICES_DIR)) {
        const serviceFiles = fs.readdirSync(SERVICES_DIR)
            .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
            .map(file => path.join(SERVICES_DIR, file));
        
        serviceFiles.forEach(filePath => {
            const changes = refactorFile(filePath);
            if (changes > 0) {
                totalChanges += changes;
                processedFiles++;
                
                // Validar após refatoração
                if (validateFile(filePath)) {
                    validatedFiles++;
                }
            }
        });
    }
    
    // Resumo
    console.log('\n📊 RESUMO DA REFATORAÇÃO - SERVICES');
    console.log('=====================================');
    console.log(`📁 Arquivos processados: ${processedFiles}`);
    console.log(`🔄 Total de mudanças: ${totalChanges}`);
    console.log(`✅ Arquivos validados: ${validatedFiles}`);
    console.log(`💾 Backups criados em: ${path.relative(BACKEND_DIR, BACKUP_DIR)}`);
    
    if (totalChanges > 0) {
        console.log('\n🎉 Refatoração da camada Services concluída com sucesso!');
        console.log('📋 Próximo passo: Continuar com a camada Utils');
    } else {
        console.log('\nℹ️  Nenhuma mudança necessária na camada Services');
    }
}

// Executar
main(); 