import express from 'express';
import { getLogger } from '../../../lib/logging/logging-service.js';

const router = express.Router();
const logger = getLogger('auth-test');

// Rota de teste de autenticação
router.get('/test', async (req, res) => {
  try {
    // Simular teste de autenticação
    const testResult = {
      authenticated: true,
      timestamp: new Date().toISOString(),
      message: 'Teste de autenticação bem-sucedido',
    };

    res.json(testResult);
  } catch (error) {
    logger.error('Erro no teste de autenticação:', { error });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

export default router;