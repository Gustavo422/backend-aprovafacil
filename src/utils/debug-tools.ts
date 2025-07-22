/**
 * Exportação centralizada de todas as ferramentas de debug
 * 
 * Este arquivo exporta todas as ferramentas de debug disponíveis no projeto,
 * facilitando a importação e uso em outros módulos.
 */

// Importações necessárias para inicialização do sistema de debug
import { createDebugger } from './debugger.js';

// Exportar ferramentas básicas de debug
export * from './debugger.js';

// Exportar ferramentas de performance
export * from './performance-debug.js';

// Exportar ferramentas de banco de dados
export * from './database-debug.js';

// Exportar ferramentas de requisições HTTP
export * from './request-debug.js';

// Exportar configurações
export * from '../config/debug.js';

/**
 * Inicializa o sistema de debug
 * 
 * Esta função configura o sistema de debug com base no ambiente atual
 * e nas configurações fornecidas.
 * 
 * @param options - Opções de inicialização (opcional)
 */
export function initializeDebugSystem(_options?: {
  namespaces?: string;
}): void {
  // Remover todas as linhas que declaram ou atribuem 'namespaces' se não for usada
  
  // Configurar com base nas opções
  // O sistema não possui enableAllDebug/configureDebug, então apenas usa getDebugNamespaces e createDebugger
  const debug = createDebugger('system');
  debug.info(`Sistema de debug inicializado (ambiente: ${process.env.NODE_ENV || 'development'})`);
}