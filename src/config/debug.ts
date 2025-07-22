/**
 * Configuração do sistema de debug
 * 
 * Este arquivo contém as configurações para o sistema de debug,
 * incluindo namespaces padrão e opções de formatação.
 */

import { DebuggerOptions } from '../utils/debugger.js';

/**
 * Configurações padrão para o sistema de debug
 */
export const DEBUG_CONFIG = {
  /**
   * Prefixo base para todos os namespaces
   */
  baseNamespace: 'app:backend',
  
  /**
   * Opções padrão para todos os debuggers
   */
  defaultOptions: {
    includeTimestamp: true,
    integrateWithLogger: true,
    useColors: true
  } as DebuggerOptions,
  
  /**
   * Namespaces ativados por padrão em ambiente de desenvolvimento
   * (pode ser sobrescrito pela variável de ambiente DEBUG)
   */
  defaultNamespaces: 'app:backend:*',
  
  /**
   * Namespaces ativados por padrão em ambiente de teste
   */
  testNamespaces: 'app:backend:error:*',
  
  /**
   * Namespaces ativados por padrão em ambiente de produção
   */
  productionNamespaces: 'app:backend:error:*,app:backend:warn:*',
  
  /**
   * Tamanho máximo da mensagem de log (caracteres)
   */
  maxLogLength: 10000,
  
  /**
   * Indica se deve registrar o tempo de execução de operações
   */
  measurePerformance: true,
  
  /**
   * Limiar para alertas de performance (ms)
   */
  performanceThreshold: {
    database: 100,  // Operações de banco de dados
    api: 500,       // Requisições de API
    service: 200    // Operações de serviço
  }
};

/**
 * Obtém os namespaces de debug com base no ambiente atual
 */
export function getDebugNamespaces(): string {
  // Priorizar a variável de ambiente DEBUG se estiver definida
  if (process.env.DEBUG) {
    return process.env.DEBUG;
  }
  
  // Caso contrário, usar os namespaces padrão com base no ambiente
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  switch (nodeEnv) {
    case 'production':
      return DEBUG_CONFIG.productionNamespaces;
    case 'test':
      return DEBUG_CONFIG.testNamespaces;
    default:
      return DEBUG_CONFIG.defaultNamespaces;
  }
}

/**
 * Obtém as opções de debug com base no namespace
 */
export function getDebugOptions(namespace: string): DebuggerOptions {
  // Opções base
  const options: DebuggerOptions = { ...DEBUG_CONFIG.defaultOptions };
  
  // Personalizar opções com base no namespace
  if (namespace.includes('performance')) {
    options.service = 'performance';
  } else if (namespace.includes('database')) {
    options.service = 'database';
  } else if (namespace.includes('api')) {
    options.service = 'api';
  }
  
  return options;
}