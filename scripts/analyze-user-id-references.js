import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, '..');

function findUserIdReferences(dir, extensions = ['.ts', '.js', '.sql', '.json']) {
  const results = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Pular node_modules e outros diretórios desnecessários
        if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              if (line.includes('usuario_id')) {
                results.push({
                  file: path.relative(backendDir, fullPath),
                  line: index + 1,
                  content: line.trim(),
                  context: lines.slice(Math.max(0, index - 2), index + 3).join('\n')
                });
              }
            });
          } catch (error) {
            console.error(`Erro ao ler arquivo ${fullPath}:`, error.message);
          }
        }
      }
    }
  }
  
  scanDirectory(dir);
  return results;
}

function categorizeReferences(references) {
  const categories = {
    database: [],
    types: [],
    services: [],
    repositories: [],
    migrations: [],
    tests: [],
    utils: [],
    others: []
  };
  
  references.forEach(ref => {
    const filePath = ref.file.toLowerCase();
    
    if (filePath.includes('migration') || filePath.includes('.sql')) {
      categories.migrations.push(ref);
    } else if (filePath.includes('test')) {
      categories.tests.push(ref);
    } else if (filePath.includes('type') || filePath.includes('dto')) {
      categories.types.push(ref);
    } else if (filePath.includes('service')) {
      categories.services.push(ref);
    } else if (filePath.includes('repository')) {
      categories.repositories.push(ref);
    } else if (filePath.includes('util') || filePath.includes('helper')) {
      categories.utils.push(ref);
    } else if (filePath.includes('database') || filePath.includes('schema')) {
      categories.database.push(ref);
    } else {
      categories.others.push(ref);
    }
  });
  
  return categories;
}

function generateReport(categories) {
  let report = '# ANÁLISE COMPLETA DE REFERÊNCIAS A usuario_id\n\n';
  report += `**Data da análise:** ${new Date().toLocaleString('pt-BR')}\n\n`;
  
  const totalReferences = Object.values(categories).reduce((sum, cat) => sum + cat.length, 0);
  report += `**Total de referências encontradas:** ${totalReferences}\n\n`;
  
  report += '## Resumo por Categoria\n\n';
  Object.entries(categories).forEach(([category, refs]) => {
    report += `- **${category}**: ${refs.length} referências\n`;
  });
  
  report += '\n## Detalhamento por Categoria\n\n';
  
  Object.entries(categories).forEach(([category, refs]) => {
    if (refs.length === 0) return;
    
    report += `### ${category.toUpperCase()} (${refs.length} referências)\n\n`;
    
    // Agrupar por arquivo
    const byFile = {};
    refs.forEach(ref => {
      if (!byFile[ref.file]) byFile[ref.file] = [];
      byFile[ref.file].push(ref);
    });
    
    Object.entries(byFile).forEach(([file, fileRefs]) => {
      report += `#### ${file}\n\n`;
      fileRefs.forEach(ref => {
        report += `**Linha ${ref.line}:**\n\`\`\`\n${ref.content}\n\`\`\`\n\n`;
      });
    });
    
    report += '\n---\n\n';
  });
  
  return report;
}

// Executar análise
console.log('🔍 Analisando referências a usuario_id no backend...');
const references = findUserIdReferences(backendDir);
const categories = categorizeReferences(references);
const report = generateReport(categories);

// Salvar relatório
const reportPath = path.join(backendDir, 'usuario_id_ANALYSIS_REPORT.md');
fs.writeFileSync(reportPath, report, 'utf8');

console.log(`\n✅ Análise concluída!`);
console.log(`📊 Total de referências encontradas: ${Object.values(categories).reduce((sum, cat) => sum + cat.length, 0)}`);
console.log(`📄 Relatório salvo em: ${reportPath}`);

// Mostrar resumo no console
console.log('\n📋 Resumo por categoria:');
Object.entries(categories).forEach(([category, refs]) => {
  if (refs.length > 0) {
    console.log(`  ${category}: ${refs.length} referências`);
  }
}); 