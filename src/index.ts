import 'dotenv/config';
// Ponto de entrada do AprovaFácil Backend
import AprovaFacilApp from './app.js';
import { setupDebug } from './config/init-debug.js';

// Configurar tratamento de erros não capturados
process.on('uncaughtException', (error: Error) => {
  console.error('Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
  console.error('Promise rejeitada não tratada:', reason);
  process.exit(1);
});

// Configurar graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Encerrando servidor graciosamente...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido. Encerrando servidor graciosamente...');
  process.exit(0);
});

// Inicializar aplicação
async function main() {
  try {
    // Inicializar sistema de debug
    setupDebug();
    
    const app = new AprovaFacilApp();
    const port = parseInt(process.env.PORT || '5000', 10);
    
    await app.start(port);
  } catch (error) {
    console.error('Erro ao inicializar aplicação:', error);
    process.exit(1);
  }
}

// Executar aplicação
main().catch((error) => {
  console.error('Erro fatal na aplicação:', error);
  process.exit(1);
});




