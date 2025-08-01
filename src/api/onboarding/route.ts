import express, { Request, Response } from 'express';
import { requestLogger } from '../../middleware/logger.js';
import type { OnboardingData } from '../../modules/onboarding/onboarding.service.js';
import { logger } from '../../lib/logger.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);

// GET - Verificar status do onboarding
router.get('/', async (req: Request, res: Response) => {
  try {
    // Simular verificação de onboarding
    const onboardingStatus = {
      completed: false,
      step: 1,
      totalSteps: 3,
    };

    res.json({
      success: true,
      data: onboardingStatus,
    });
  } catch (error) {
    logger.error('Erro ao verificar onboarding:', { error });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// POST - Salvar dados do onboarding
router.post('/', async (req: Request, res: Response) => {
  try {
    const onboardingData: OnboardingData = req.body;

    // Simular salvamento dos dados
    logger.info('Dados de onboarding recebidos', { data: onboardingData });

    res.status(200).json({ message: 'Onboarding concluído com sucesso.' });
  } catch (error) {
    logger.error('Erro ao processar requisição POST /api/onboarding:', { error });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

export default router; 