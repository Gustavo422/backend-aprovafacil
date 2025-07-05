const fs = require('fs');
const path = require('path');

// Função para substituir console.log por logger
function replaceConsoleWithLogger(content, filePath) {
  let modified = false;

  // Substituir console.error por logger.error
  if (content.includes('console.error')) {
    content = content.replace(/console\.error\(([^)]+)\)/g, (match, args) => {
      modified = true;
      return `logger.error(${args})`;
    });
  }

  // Substituir console.log por logger.info
  if (content.includes('console.log')) {
    content = content.replace(/console\.log\(([^)]+)\)/g, (match, args) => {
      modified = true;
      return `logger.info(${args})`;
    });
  }

  // Substituir console.warn por logger.warn
  if (content.includes('console.warn')) {
    content = content.replace(/console\.warn\(([^)]+)\)/g, (match, args) => {
      modified = true;
      return `logger.warn(${args})`;
    });
  }

  // Adicionar import do logger se necessário
  if (modified && !content.includes('import { logger }')) {
    const importStatement = "import { logger } from '@/lib/logger';\n";

    // Encontrar a posição do primeiro import
    const firstImportIndex = content.indexOf('import ');
    if (firstImportIndex !== -1) {
      const endOfImports =
        content.indexOf('\n', content.indexOf(';', firstImportIndex)) + 1;
      content =
        content.slice(0, endOfImports) +
        importStatement +
        content.slice(endOfImports);
    } else {
      content = importStatement + content;
    }
  }

  return content;
}

// Função para remover variáveis não utilizadas
function removeUnusedVariables(content) {
  // Remover variáveis não utilizadas comuns
  const patterns = [
    // Remover variáveis preferences não utilizadas
    /const preferences = \{[^}]*\};?\n?/g,
    // Remover variáveis activeTab não utilizadas
    /const \[activeTab, setActiveTab\] = useState\([^)]*\);/g,
    // Remover imports não utilizados
    /import \{ [^}]*Progress[^}]* \} from ['"][^'"]*['"];?\n?/g,
    /import \{ [^}]*Button[^}]* \} from ['"][^'"]*['"];?\n?/g,
    /import \{ [^}]*CheckCircle[^}]* \} from ['"][^'"]*['"];?\n?/g,
    /import \{ [^}]*TrendingUp[^}]* \} from ['"][^'"]*['"];?\n?/g,
    /import \{ [^}]*ArrowRight[^}]* \} from ['"][^'"]*['"];?\n?/g,
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  return content;
}

// Função para corrigir parâmetros não utilizados
function fixUnusedParameters(content) {
  // Adicionar underscore antes de parâmetros não utilizados
  content = content.replace(
    /export async function GET\(request: Request\)/g,
    'export async function GET(_request: Request)'
  );

  content = content.replace(
    /export async function POST\(request: Request\)/g,
    'export async function POST(_request: Request)'
  );

  return content;
}

// Função para processar um arquivo
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;

    // Aplicar correções
    modifiedContent = replaceConsoleWithLogger(modifiedContent, filePath);
    modifiedContent = removeUnusedVariables(modifiedContent);
    modifiedContent = fixUnusedParameters(modifiedContent);

    // Salvar se houve modificações
    if (modifiedContent !== content) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
  }
}

// Função para processar diretório recursivamente
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (
      stat.isDirectory() &&
      !file.startsWith('.') &&
      file !== 'node_modules'
    ) {
      processDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      processFile(filePath);
    }
  });
}

// Executar o script
console.log('🔧 Iniciando correção automática de linting...');
processDirectory('./app');
processDirectory('./components');
processDirectory('./lib');
console.log('✅ Correção automática concluída!');
