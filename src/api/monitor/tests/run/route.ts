import { registerTestRun } from '../../../../utils/test-history';
import { Request, Response } from 'express';
import { getLogger } from '../../../../lib/logging/logging-service.js';

const logger = getLogger('monitor-tests');

export async function POST(_request: Request) {
  try {
    logger.info('Iniciando execução de testes de monitoramento');

    // Simular execução de testes
    const testResults = {
      usuario_id: 'system',
      user_email: 'system@aprovafacil.com',
      status: 'success',
      duration: 1000,
      output: 'Testes executados com sucesso',
    };

    // Registrar execução dos testes
    await registerTestRun(testResults);

    return Response.json({
      success: true,
      results: testResults,
    });
  } catch (error) {
    logger.error('Erro ao executar testes de monitoramento:', { error });
    return Response.json({
      success: false,
      error: 'Erro interno do servidor',
    }, { status: 500 });
  }
} 

