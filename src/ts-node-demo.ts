import { getLogger } from './lib/logging/logging-service.js';

const logger = getLogger('ts-node-demo');

logger.info('🚀 Iniciando demonstração do ts-node');

// Simular algumas operações
const operations = [
  'Carregando configurações',
  'Conectando ao banco de dados',
  'Inicializando middlewares',
  'Configurando rotas',
];

operations.forEach((operation, index) => {
  setTimeout(() => {
    logger.info(`✅ ${operation} - ${index + 1}/${operations.length}`);
  }, index * 1000);
});

// Simular erro após 5 segundos
setTimeout(() => {
  logger.error('❌ Erro simulado para teste de logging');
}, 5000);

logger.info('🎯 Demonstração concluída');