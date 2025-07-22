/**
 * Script de demonstração do sistema de debug
 * 
 * Este script demonstra o uso do sistema de debug em diferentes cenários.
 * 
 * Para executar:
 * - Sem debug: node scripts/debug-demo.js
 * - Com debug geral: DEBUG=app:backend:* node scripts/debug-demo.js
 * - Com debug específico: DEBUG=app:backend:auth:*,app:backend:database:* node scripts/debug-demo.js
 */

import { createDebugger, createModuleDebugger, enableAllDebug } from '../dist/utils/debugger.js';
import { authenticateUser, checkPermission } from '../dist/modules/auth/auth-debug.js';
import { executeWithDebug } from '../dist/utils/database-debug.js';
import { measureAsync } from '../dist/utils/performance-debug.js';

// Ativar todos os debuggers para a demonstração
// Comentar esta linha para usar apenas os namespaces definidos na variável de ambiente DEBUG
enableAllDebug();

async function runDemo() {
  console.log('=== Demonstração do Sistema de Debug ===');
  
  // 1. Demonstração de debug básico
  const basicDebug = createDebugger('demo');
  basicDebug('Iniciando demonstração de debug');
  
  // 2. Demonstração de debug por módulo
  const userDebug = createModuleDebugger('demo', 'user');
  userDebug('Debug específico para o módulo de usuários');
  userDebug.info('Mensagem de informação');
  userDebug.warn('Mensagem de aviso');
  
  // 3. Demonstração de medição de performance
  await measureAsync(
    async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      return 'Operação concluída';
    },
    { name: 'operacaoDemorada', category: 'demo', threshold: 100 }
  );
  
  // 4. Demonstração de debug de banco de dados
  await executeWithDebug(
    async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
      return { rows: [{ id: 1, name: 'Produto 1' }, { id: 2, name: 'Produto 2' }], rowCount: 2 };
    },
    {
      operation: 'buscarProdutos',
      table: 'produtos',
      query: 'SELECT * FROM produtos WHERE categoria_id = $1',
      params: { categoria_id: 5 }
    }
  );
  
  // 5. Demonstração de debug de autenticação
  console.log('\n=== Demonstração de Autenticação ===');
  
  // 5.1. Login bem-sucedido
  const loginResult = await authenticateUser('admin@example.com', 'password');
  console.log('Resultado do login:', loginResult.success ? 'Sucesso' : 'Falha');
  
  // 5.2. Login com falha
  const failedLogin = await authenticateUser('unknown@example.com', 'wrong');
  console.log('Resultado do login inválido:', failedLogin.success ? 'Sucesso' : 'Falha');
  
  // 5.3. Verificação de permissão
  const hasPermission = checkPermission('admin', 'users', 'delete');
  console.log('Tem permissão:', hasPermission);
  
  console.log('\n=== Demonstração Concluída ===');
  console.log('Para ver logs detalhados, execute com DEBUG=app:backend:*');
}

// Executar a demonstração
runDemo().catch(error => {
  console.error('Erro na demonstração:', error);
});