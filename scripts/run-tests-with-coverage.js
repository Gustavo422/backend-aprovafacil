#!/usr/bin/env node

/**
 * Script para executar testes com cobertura completa
 * Gera relatórios detalhados e verifica thresholds
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader(message) {
  log(`\n${ '='.repeat(60)}`, 'cyan')
  log(` ${message}`, 'bright')
  log('='.repeat(60), 'cyan')
}

function logSection(message) {
  log(`\n${ '-'.repeat(40)}`, 'yellow')
  log(` ${message}`, 'yellow')
  log('-'.repeat(40), 'yellow')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

async function runCommand(command, descricao) {
  try {
    logInfo(`Executando: ${descricao}`)
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' }
    })
    logSuccess(`${descricao} - Concluído`)
    return { success: true, output: result }
  } catch (error) {
    logError(`${descricao} - Falhou`)
    logError(error.message)
    return { success: false, output: error.message }
  }
}

function createCoverageReport(coverageData) {
  const reportDir = join(process.cwd(), 'coverage')
  
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true })
  }

  const reportPath = join(reportDir, 'test-report.json')
  writeFileSync(reportPath, JSON.stringify(coverageData, null, 2))
  
  logSuccess(`Relatório salvo em: ${reportPath}`)
}

function analyzeCoverage(coverageData) {
  const thresholds = {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }

  const results = {
    passed: true,
    details: {}
  }

  for (const [metric, threshold] of Object.entries(thresholds)) {
    const actual = coverageData.total[metric]?.pct || 0
    const passed = actual >= threshold
    
    results.details[metric] = {
      actual: Math.round(actual * 100) / 100,
      threshold,
      passed
    }
    
    if (!passed) {
      results.passed = false
    }
  }

  return results
}

function displayCoverageResults(results) {
  logSection('Resultados da Cobertura')
  
  for (const [metric, data] of Object.entries(results.details)) {
    const status = data.passed ? '✅' : '❌'
    const color = data.passed ? 'green' : 'red'
    
    log(`${status} ${metric.toUpperCase()}: ${data.actual}% (threshold: ${data.threshold}%)`, color)
  }
  
  if (results.passed) {
    logSuccess('Todas as métricas de cobertura foram atendidas!')
  } else {
    logError('Algumas métricas de cobertura não foram atendidas')
  }
}

function displayTestSummary(testResults) {
  logSection('Resumo dos Testes')
  
  if (testResults.success) {
    // Extrair informações do output do Vitest
    const output = testResults.output
    
    // Contar testes
    const testMatch = output.match(/(\d+) tests?/i)
    const passedMatch = output.match(/(\d+) passed/i)
    const failedMatch = output.match(/(\d+) failed/i)
    
    if (testMatch) {
      logInfo(`Total de testes: ${testMatch[1]}`)
    }
    if (passedMatch) {
      logSuccess(`Testes aprovados: ${passedMatch[1]}`)
    }
    if (failedMatch) {
      logError(`Testes falharam: ${failedMatch[1]}`)
    }
  } else {
    logError('Falha na execução dos testes')
  }
}

async function main() {
  logHeader('🧪 EXECUTOR DE TESTES AUTOMATIZADOS')
  
  const startTime = Date.now()
  
  // Verificar se estamos no diretório correto
  if (!existsSync('package.json')) {
    logError('package.json não encontrado. Execute este script no diretório do projeto.')
    process.exit(1)
  }

  // Verificar se o Vitest está instalado
  if (!existsSync('node_modules/vitest')) {
    logError('Vitest não encontrado. Execute "npm install" primeiro.')
    process.exit(1)
  }

  logSection('Preparação do Ambiente')
  
  // Limpar cache se necessário
  await runCommand('npm run maintenance:clear-all-cache', 'Limpando cache')
  
  // Verificar tipos TypeScript
  const typeCheck = await runCommand('npm run typecheck', 'Verificação de tipos TypeScript')
  if (!typeCheck.success) {
    logWarning('Problemas de tipos encontrados, mas continuando com os testes...')
  }

  logSection('Execução dos Testes')
  
  // Executar testes com cobertura
  const testResults = await runCommand(
    'npm run test:coverage',
    'Executando testes com cobertura'
  )

  if (!testResults.success) {
    logError('Testes falharam. Verifique os erros acima.')
    process.exit(1)
  }

  // Executar testes de integração
  const integrationResults = await runCommand(
    'node scripts/test-integration.js',
    'Executando testes de integração'
  )

  if (!integrationResults.success) {
    logWarning('Testes de integração falharam, mas continuando...')
  }

  logSection('Análise de Resultados')
  
  // Tentar extrair dados de cobertura do output
  const coverageMatch = testResults.output.match(/Coverage Report.*?(\{.*\})/s)
  let coverageData = null
  
  if (coverageMatch) {
    try {
      coverageData = JSON.parse(coverageMatch[1])
    } catch (e) {
      logWarning('Não foi possível extrair dados de cobertura do output')
    }
  }

  // Se não conseguiu extrair do output, tentar ler do arquivo
  if (!coverageData && existsSync('coverage/coverage-summary.json')) {
    try {
      const fs = await import('fs')
      coverageData = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'))
    } catch (e) {
      logWarning('Não foi possível ler arquivo de cobertura')
    }
  }

  if (coverageData) {
    const analysis = analyzeCoverage(coverageData)
    displayCoverageResults(analysis)
    createCoverageReport(coverageData)
    
    if (!analysis.passed) {
      logWarning('Cobertura abaixo do threshold. Considere adicionar mais testes.')
    }
  }

  displayTestSummary(testResults)

  logSection('Limpeza')
  
  // Limpar dados de teste se necessário
  await runCommand('npm run maintenance:clear-db-cache', 'Limpando cache do banco')

  const endTime = Date.now()
  const duration = Math.round((endTime - startTime) / 1000)

  logSection('Conclusão')
  logSuccess(`Execução concluída em ${duration} segundos`)
  
  if (testResults.success) {
    logSuccess('🎉 Todos os testes passaram com sucesso!')
    process.exit(0)
  } else {
    logError('💥 Alguns testes falharam. Verifique os resultados acima.')
    process.exit(1)
  }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection at:')
  logError(promise)
  logError('reason:')
  logError(reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:')
  logError(error.message)
  logError(error.stack)
  process.exit(1)
})

// Executar o script
main().catch(error => {
  logError('Erro fatal durante execução:')
  logError(error.message)
  process.exit(1)
}) 



