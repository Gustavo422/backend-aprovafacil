import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapeamento de pastas antigas para novas
const FOLDER_MAPPING = {
  'simulados': 'simulados-personalizados',
  'questoes-semanais': '100-questoes',
  'plano-estudos': 'plano-estudos-inteligente',
  'mapa-assuntos': 'mapa-materias',
  'flashcards': 'cartoes-memorizacao',
  'apostilas': 'apostila-inteligente',
};

// Diretório base do projeto
const BASE_DIR = path.join(__dirname, '..');

// Diretórios a serem processados
const DIRS_TO_PROCESS = [
  path.join(BASE_DIR, 'app', 'dashboard'),
  path.join(BASE_DIR, 'app', 'api'),
];

// Extensões de arquivo para processar
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

// Função para atualizar referências nos arquivos
async function updateFileReferences(oldName, newName) {
  const searchPattern = new RegExp(oldName, 'g');
  
  for (const dir of DIRS_TO_PROCESS) {
    await processDirectory(dir, async (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (!FILE_EXTENSIONS.includes(ext)) return;
      
      const content = await fs.readFile(filePath, 'utf8');
      const newContent = content.replace(searchPattern, newName);
      
      if (content !== newContent) {
        console.log(`Atualizando referências em: ${filePath}`);
        await fs.writeFile(filePath, newContent, 'utf8');
      }
    });
  }
}

// Função auxiliar para processar diretórios recursivamente
async function processDirectory(dir, fileCallback) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath, fileCallback);
      } else if (entry.isFile()) {
        await fileCallback(fullPath);
      }
    }
  } catch (error) {
    console.error(`Erro ao processar diretório ${dir}:`, error);
  }
}

// Função principal
async function main() {
  console.log('Iniciando renomeação de pastas...');
  
  // Primeiro, renomear as pastas
  for (const [oldName, newName] of Object.entries(FOLDER_MAPPING)) {
    const oldPath = path.join(BASE_DIR, 'app', 'dashboard', oldName);
    const newPath = path.join(BASE_DIR, 'app', 'dashboard', newName);
    
    try {
      await fs.rename(oldPath, newPath);
      console.log(`✅ Pasta renomeada: ${oldName} -> ${newName}`);
    } catch (error) {
      console.error(`❌ Erro ao renomear pasta ${oldName}:`, error.message);
    }
  }
  
  console.log('\nAtualizando referências nos arquivos...');
  
  // Depois, atualizar as referências nos arquivos
  for (const [oldName, newName] of Object.entries(FOLDER_MAPPING)) {
    console.log(`\nAtualizando referências de ${oldName} para ${newName}...`);
    await updateFileReferences(oldName, newName);
    
    // Atualizar também as rotas da API
    if (oldName === 'simulados') {
      await updateFileReferences('simulados-personalizados', 'simulados-personalizados');
    } else if (oldName === 'questoes-semanais') {
      await updateFileReferences('100-questoes', '100-questoes');
    } else if (oldName === 'plano-estudos') {
      await updateFileReferences('plano-estudos-inteligente', 'plano-estudos-inteligente');
    } else if (oldName === 'mapa-assuntos') {
      await updateFileReferences('mapa-materias', 'mapa-materias');
    } else if (oldName === 'flashcards') {
      await updateFileReferences('cartoes-memorizacao', 'cartoes-memorizacao');
    } else if (oldName === 'apostilas') {
      await updateFileReferences('apostila-inteligente', 'apostila-inteligente');
    }
  }
  
  console.log('\n✅ Processo concluído!');
}

// Executar o script
main().catch(console.error);

export {}; // Para marcar o módulo como um módulo ES
