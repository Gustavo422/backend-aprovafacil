/* eslint-disable */
/**
 * Script de teste de desempenho alternativo
 * Executa testes de carga e desempenho básicos na aplicação
 * 
 * Uso:
 *   node scripts/performance-test.js [--ci] [--url=<url>] [--iterations=<number>]
 * 
 * Opções:
 *   --ci           Modo CI (não abre o navegador gráfico)
 *   --url          URL base da aplicação (padrão: http://localhost:3000)
 *   --iterations   Número de iterações por página (padrão: 3)
 */

// TODO: Refatorar para backend puro. Blocos comentados por depender de variáveis globais Node.js/browser/SSR.
/*
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { Command } from 'commander';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializa o Commander
const program = new Command();

// Configuração das opções de linha de comando
program
  .option('--ci', 'Modo CI (sem interface gráfica)', false)
  .option('--url <url>', 'URL base da aplicação', 'http://localhost:3000')
  .option('--iterations <number>', 'Número de iterações por página', '3')
  .parse(process.argv);

const options = program.opts();

// Configurações
const BASE_URL = options.url || 'http://localhost:3000';
const PAGES_TO_TEST = [
  { path: '/', name: 'home' },
  { path: '/login', name: 'login' },
  { path: '/dashboard', name: 'dashboard' },
];
const TEST_ITERATIONS = parseInt(options.iterations, 10) || 3;
const REPORT_DIR = './performance-reports';
const IS_CI = options.ci || process.env.CI === 'true';

// Garante que o diretório de relatórios existe
try {
  await fs.access(REPORT_DIR);
} catch (err) {
  if (err.code === 'ENOENT') {
    await fs.mkdir(REPORT_DIR, { recursive: true });
  } else {
    log(`Erro ao acessar o diretório de relatórios: ${err.message}`, 'error');
    process.exit(1);
  }
}

// Função para formatar a data para o nome do arquivo
function formatDate() {
  const now = new Date();
  return now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .replace('Z', '');
}

// Função para formatar mensagens de log
// Logger configuration
const logger = {
  error: (message) => process.stderr.write(`[ERROR] ${message}\n`),
  success: (message) => process.stdout.write(`✅ ${message}\n`),
  info: (message) => process.stdout.write(`[INFO] ${message}\n`),
  debug: (message) => !IS_CI && process.stdout.write(`[DEBUG] ${message}\n`)
};

/**
 * Logs a message with the specified log level
 * @param {string} message - The message to log
 * @param {'error'|'success'|'info'|'debug'} [type='info'] - The log level
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  
  if (logger[type]) {
    logger[type](formattedMessage);
  } else {
    logger.info(formattedMessage);
  }
}

// Função para verificar se um diretório existe
async function directoryExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// Função para salvar os resultados em um arquivo JSON
async function saveResults(results) {
  try {
    const timestamp = formatDate();
    const filename = `performance-report-${timestamp}.json`;
    const filepath = join(REPORT_DIR, filename);
    
    // Garante que o diretório existe
    if (!(await directoryExists(REPORT_DIR))) {
      await fs.mkdir(REPORT_DIR, { recursive: true });
    }
    
    // Formata os resultados para JSON
    const jsonData = JSON.stringify(results, null, 2);
    
    // Escreve o arquivo
    await fs.writeFile(filepath, jsonData);
    
    log(`Relatório salvo em: ${filepath}`, 'success');
    return filepath;
    
  } catch (error) {
    log(`Erro ao salvar o relatório: ${error.message}`, 'error');
    throw error; // Propaga o erro para ser tratado pelo chamador
  }
}

// Função para medir o tempo de carregamento de uma página
async function measurePageLoad(browser, pageInfo) {
  const { name, path } = pageInfo;
  const url = `${BASE_URL}${path}`;
  const results = [];
  
  log(`\nTestando página: ${name} (${url})`, 'info');
  
  // Executa o teste várias vezes para obter uma média
  for (let i = 0; i < TEST_ITERATIONS; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      log(`  Iteração ${i + 1}/${TEST_ITERATIONS}...`, 'debug');
      
      // Inicia a medição
      const startTime = performance.now();
      
      // Navega para a URL
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 60000 // 60 segundos de timeout
      });
      
      // Aguarda o carregamento completo da página
      await page.waitForLoadState('networkidle');
      
      // Calcula o tempo de carregamento
      const loadTime = performance.now() - startTime;
      
      // Captura métricas adicionais
      const metrics = await page.evaluate(() => ({
        timing: performance.timing,
        navigation: performance.getEntriesByType('navigation')[0],
        paint: performance.getEntriesByType('paint'),
        memory: window.performance.memory,
        now: performance.now()
      }));
      
      // Captura métricas específicas do Playwright
      const performanceMetrics = await page.evaluate(() => ({
        timing: {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          load: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domComplete: performance.timing.domComplete - performance.timing.navigationStart
        },
        resources: performance.getEntriesByType('resource').map(r => ({
          name: r.name,
          duration: r.duration,
          initiatorType: r.initiatorType,
          transferSize: r.transferSize
        }))
      }));
      
      // Armazena os resultados
      results.push({
        iteration: i + 1,
        url,
        status: response.status(),
        statusText: response.statusText(),
        loadTime,
        metrics: {
          ...metrics,
          performance: performanceMetrics
        }
      });
      
      log(`  Carregamento concluído em ${loadTime.toFixed(2)}ms (Status: ${response.status()})`, 'debug');
      
    } catch (error) {
      log(`  Erro ao testar ${url}: ${error.message}`, 'error');
      
      results.push({
        iteration: i + 1,
        url,
        error: error.message,
        loadTime: -1
      });
      
      // Em modo CI, falha no primeiro erro
      if (IS_CI) {
        throw error;
      }
    } finally {
      await context.close();
    }
  }
  
  return {
    page: name,
    url,
    results
  };
}

// Função para obter informações do sistema (usando importação dinâmica)
async function getSystemInfo() {
  try {
    const os = await import('node:os');
    return {
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      platform: os.platform(),
      release: os.release(),
      type: os.type()
    };
  } catch (error) {
    log(`Erro ao obter informações do sistema: ${error.message}`, 'warn');
    return {};
  }
}

// Função principal para executar os testes
async function runPerformanceTests() {
  log('Iniciando testes de desempenho...', 'info');
  log(`URL base: ${BASE_URL}`, 'debug');
  log(`Iterações por página: ${TEST_ITERATIONS}`, 'debug');
  log('----------------------------------------', 'debug');
  
  const browser = await chromium.launch({
    headless: IS_CI || !process.stdout.isTTY,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-zygote',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials'
    ]
  });
  
  const testResults = [];
  
  try {
    // Obtém informações do sistema
    const systemInfo = await getSystemInfo();
    
    // Executa os testes para cada página
    for (const pageInfo of PAGES_TO_TEST) {
      const fullUrl = `${BASE_URL}${pageInfo.path}`;
      log(`Testando: ${fullUrl}`, 'info');
      
      const pageResults = [];
      
      // Executa múltiplas iterações para cada página
      for (let i = 0; i < TEST_ITERATIONS; i++) {
        log(`Iteração ${i + 1}/${TEST_ITERATIONS}...`, 'debug');
        try {
          const result = await measurePageLoad(browser, pageInfo);
          pageResults.push(...result.results);
          
          // Pequena pausa entre as iterações
          if (i < TEST_ITERATIONS - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          log(`Erro na iteração ${i + 1}: ${error.message}`, 'error');
          pageResults.push({
            url: fullUrl,
            error: error.message,
            loadTime: -1,
            iteration: i + 1
          });
        }
      }
      
      // Calcula estatísticas para a página
      const validResults = pageResults.filter(r => r && r.loadTime > 0);
      const loadTimes = validResults.map(r => r.loadTime);
      
      const stats = loadTimes.length > 0 ? {
        averageLoadTime: loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length,
        minLoadTime: Math.min(...loadTimes),
        maxLoadTime: Math.max(...loadTimes),
        p50: calculatePercentile(loadTimes, 0.5),
        p90: calculatePercentile(loadTimes, 0.9),
        p95: calculatePercentile(loadTimes, 0.95),
        successRate: (validResults.length / pageResults.length) * 100
      } : {
        averageLoadTime: -1,
        minLoadTime: -1,
        maxLoadTime: -1,
        p50: -1,
        p90: -1,
        p95: -1,
        successRate: 0
      };
      
      testResults.push({
        page: pageInfo.name,
        url: fullUrl,
        iterations: pageResults.length,
        successfulIterations: validResults.length,
        ...stats,
        details: pageResults
      });
    }
    
    // Prepara o relatório
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        os: process.platform,
        arch: process.arch,
        ci: IS_CI,
        ...systemInfo
      },
      config: {
        baseUrl: BASE_URL,
        iterations: TEST_ITERATIONS,
        testUrls: PAGES_TO_TEST.map(p => ({
          name: p.name,
          path: p.path,
          url: `${BASE_URL}${p.path}`
        }))
      },
      results: testResults
    };
    
    // Salva o relatório
    const reportPath = await saveResults(report);
    
    // Exibe estatísticas para cada página testada
    testResults.forEach(result => {
      log(`\n📊 Resultados para ${result.page} (${result.url}):`, 'info');
      log(`  ✅ Taxa de sucesso: ${result.successRate.toFixed(1)}% (${result.successfulIterations}/${result.iterations})`, 
        result.successRate < 50 ? 'warn' : 'info');
      log(`  ⏱️  Tempo médio de carregamento: ${result.averageLoadTime.toFixed(2)}ms`, 'info');
      log(`  📈 Percentis (p50/p90/p95): ${result.p50.toFixed(2)}ms / ${result.p90.toFixed(2)}ms / ${result.p95.toFixed(2)}ms`, 'info');
      
      // Exibe detalhes de erros, se houver
      if (result.successRate < 100) {
        const errors = result.details
          .filter(r => r.error)
          .map((r, i) => `    ${i + 1}. Iteração ${r.iteration || 'N/A'}: ${r.error}`)
          .join('\n');
        
        if (errors) {
          log('  ❌ Erros encontrados:', 'warn');
          log(errors, 'warn');
        }
      }
    });
    
    log(`\n✅ Relatório salvo em: ${reportPath}`, 'success');
    return reportPath;
    
  } catch (error) {
    log(`❌ Erro durante a execução dos testes: ${error.message}`, 'error');
    log(`🔍 Stack trace: ${error.stack}`, 'debug');
    
    // Tenta salvar resultados parciais em caso de erro
    if (testResults.length > 0) {
      try {
        const partialReport = {
          timestamp: new Date().toISOString(),
          environment: {
            node: process.version,
            os: process.platform,
            arch: process.arch,
            ci: IS_CI
          },
          error: error.message,
          stack: error.stack,
          partialResults: testResults,
          isPartial: true
        };
        
        const errorReportPath = await saveResults(partialReport);
        log(`⚠️  Relatório parcial salvo em: ${errorReportPath}`, 'warn');
      } catch (saveError) {
        log(`❌ Erro ao salvar relatório parcial: ${saveError.message}`, 'error');
      }
    }
    
    process.exit(1);
  } finally {
    try {
      if (browser) {
        await browser.close().catch(err => {
          log(`Erro ao fechar o navegador: ${err.message}`, 'error');
        });
      }
    } catch (browserError) {
      log(`Erro ao fechar o navegador: ${browserError.message}`, 'error');
    }
  }
}

// Função auxiliar para calcular percentis
function calculatePercentile(values, percentile) {
  if (!values.length) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(percentile * (sorted.length - 1));
  
  // Se o índice for inteiro, retorna o valor correspondente
  if (percentile * (sorted.length - 1) % 1 === 0) {
    return sorted[index];
  }
  
  // Caso contrário, faz uma interpolação linear
  const lower = sorted[Math.floor(index)];
  const upper = sorted[Math.ceil(index)];
  return lower + (upper - lower) * (percentile * (sorted.length - 1) % 1);
}

// Executa os testes
const main = async () => {
  try {
    log('Iniciando execução dos testes de desempenho...', 'info');
    log(`Modo CI: ${IS_CI ? 'Sim' : 'Não'}`, 'debug');
    log(`Diretório de relatórios: ${REPORT_DIR}`, 'debug');
    
    // Verifica se o servidor está rodando
    try {
      log('Verificando se o servidor está rodando...', 'info');
      const response = await fetch(BASE_URL, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`O servidor retornou status ${response.status}`);
      }
    } catch (error) {
      log(`❌ Não foi possível conectar ao servidor em ${BASE_URL}`, 'error');
      log(`Certifique-se de que o servidor está rodando e acessível em ${BASE_URL}`, 'warn');
      log(`Erro: ${error.message}`, 'debug');
      process.exit(1);
    }
    
    const startTime = Date.now();
    const results = await runPerformanceTests();
    const duration = (Date.now() - startTime) / 1000;
    
    log(`\n✅ Testes de desempenho concluídos em ${duration.toFixed(2)} segundos`, 'success');
    
    // Verifica se houve falhas
    if (results && results.results && Array.isArray(results.results)) {
      const failedTests = results.results.filter(r => r && r.successRate < 100);
      if (failedTests.length > 0) {
        log(`\n⚠️  Atenção: ${failedTests.length} de ${results.results.length} URLs tiveram falhas`, 'warn');
        process.exitCode = 1; // Indica falha sem interromper o processo
      }
    } else {
      log('⚠️  Nenhum resultado foi retornado dos testes', 'warn');
      process.exitCode = 1;
    }
    
    process.exit(0);
  } catch (error) {
    log(`\n❌ Erro durante a execução dos testes: ${error.message}`, 'error');
    log(`Stack trace: ${error.stack}`, 'debug');
    process.exit(1);
  }
};

// Executa o script principal
main();

