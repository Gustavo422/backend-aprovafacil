/**
 * Inicialização do sistema de debug
 * 
 * Este arquivo é responsável por inicializar o sistema de debug
 * durante a inicialização da aplicação.
 */

import { initializeDebugSystem } from '../utils/debug-tools.js';

/**
 * Inicializa o sistema de debug com base no ambiente
 */
export function setupDebug(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Inicializar o sistema de debug
  initializeDebugSystem();
  
  // Registrar informações sobre o ambiente
  console.log(`🐛 Sistema de debug inicializado (${nodeEnv})`);
  
  if (nodeEnv === 'development') {
    console.log('💡 Para ver todos os logs de debug, execute:');
    console.log('   npm run dev:debug');
    console.log('   ou');
    console.log('   DEBUG=app:backend:* npm run dev');
  }
}

// Executar a configuração se este arquivo for importado diretamente (compatível com ES modules)
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDebug();
}