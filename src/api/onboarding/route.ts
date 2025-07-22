import express, { Request, Response } from 'express';
import { OnboardingService } from '../../modules/onboarding/onboarding.service.js';
import { LogService } from '../../core/utils/log.service.js';
import { supabase } from '../../config/supabase.js';
import jwt from 'jsonwebtoken';
import { requestLogger } from '../../middleware/logger.js';
import type { OnboardingData } from '../../modules/onboarding/onboarding.service.js';

interface DecodedToken {
  sub?: string;
  userId?: string;
  id?: string;
}

const router = express.Router();
const logService = new LogService(supabase, 'ONBOARDING');
const onboardingService = new OnboardingService(logService);

// Aplicar middlewares globais
router.use(requestLogger);

// GET - Verificar se usuário precisa fazer onboarding
router.get('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Token de autenticação necessário'
        }
      });
    }
    const token = authHeader.substring(7);
    // Extrair userId do JWT
    let userId: string | undefined;
    try {
      const decoded = jwt.decode(token) as DecodedToken | null;
      if (decoded) {
        userId = decoded.sub || decoded.userId || decoded.id;
      }
    } catch {
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token inválido' } });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token inválido' } });
    }
    const requiresOnboarding = await onboardingService.requireOnboarding(userId);
    res.json({
      success: true,
      requiresOnboarding,
      message: requiresOnboarding ? 'Onboarding necessário' : 'Onboarding já concluído'
    });
  } catch (error) {
    console.error('Erro ao verificar onboarding:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      }
    });
  }
});

// POST - Salvar respostas do onboarding
router.post('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Token de autenticação necessário'
        }
      });
    }
    const token = authHeader.substring(7);
    // Extrair userId do JWT
    let userId: string | undefined;
    try {
      const decoded = jwt.decode(token) as DecodedToken | null;
      if (decoded) {
        userId = decoded.sub || decoded.userId || decoded.id;
      }
    } catch {
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token inválido' } });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token inválido' } });
    }
    const onboardingData = req.body;
    // Validar dados obrigatórios
    if (!onboardingData || typeof onboardingData !== 'object' ||
        !('concurso_id' in onboardingData) ||
        !('horas_disponiveis' in onboardingData) ||
        !('tempo_falta_concurso' in onboardingData) ||
        !('nivel_preparacao' in onboardingData)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados de onboarding incompletos'
        }
      });
    }
    const success = await onboardingService.saveOnboarding(userId, onboardingData as OnboardingData);
    if (success) {
      res.json({
        success: true,
        message: 'Onboarding salvo com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: 'Erro ao salvar onboarding'
        }
      });
    }
  } catch (error) {
    console.error('Erro ao salvar onboarding:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      }
    });
  }
});

export default router; 