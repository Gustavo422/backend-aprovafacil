import fs from 'fs/promises';
import path from 'path';

export interface TestStatus {
  status: 'healthy' | 'warning' | 'error';
  lastRun: string | null;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  coverage: number;
  testFiles: string[];
  recentResults: {
    timestamp: string;
    passed: number;
    failed: number;
    duration: number;
  }[];
  errors: string[];
}

export async function getTestStatus(): Promise<TestStatus> {
  const errors: string[] = [];
  let testFiles: string[] = [];
  let recentResults: TestStatus['recentResults'] = [];
  
  try {
    // Encontrar arquivos de teste
    const testsDir = path.join(process.cwd(), 'tests');
    const srcDir = path.join(process.cwd(), 'src');
    
    const testFilesPromises = [
      scanForTestFiles(testsDir),
      scanForTestFiles(srcDir)
    ];
    
    const [testsDirFiles, srcDirFiles] = await Promise.all(testFilesPromises);
    testFiles = [...testsDirFiles, ...srcDirFiles];
    
    // Tentar ler resultados recentes (se existir)
    try {
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      await fs.readFile(coveragePath, 'utf-8');
      // Processar dados de cobertura se necessário
    } catch {
      // Coverage não disponível, não é erro crítico
    }
    
  } catch {
    errors.push('Erro ao escanear testes');
  }
  
  // Status baseado na disponibilidade dos testes
  const status = errors.length > 0 ? 'error' : testFiles.length === 0 ? 'warning' : 'healthy';
  
  return {
    status,
    lastRun: null, // Será preenchido quando implementarmos execução via dashboard
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    coverage: 0,
    testFiles,
    recentResults,
    errors
  };
}

async function scanForTestFiles(dir: string): Promise<string[]> {
  const testFiles: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await scanForTestFiles(fullPath);
        testFiles.push(...subFiles);
      } else if (entry.isFile() && isTestFile(entry.name)) {
        testFiles.push(fullPath);
      }
    }
  } catch {
    // Diretório não existe ou não acessível, ignorar
  }
  
  return testFiles;
}

function isTestFile(filenome: string): boolean {
  return filenome.includes('.test.') || 
         filenome.includes('.spec.') || 
         filenome.endsWith('.test.ts') || 
         filenome.endsWith('.test.js') ||
         filenome.endsWith('.spec.ts') || 
         filenome.endsWith('.spec.js');
} 



