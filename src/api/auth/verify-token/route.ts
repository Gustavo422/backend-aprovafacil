import type { Request, Response } from 'express';
import { Router } from 'express';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

export const verifyTokenHandler = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        valid: false,
        error: 'Token de autenticação não fornecido',
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        valid: false,
        error: 'Token inválido ou expirado',
      });
    }

    return res.json({
      valid: true,
      user: {
        id: user.id,
        nome: user.user_metadata?.nome ?? user.email ?? '',
        email: user.email ?? '',
        role: user.user_metadata?.role ?? 'user',
      },
    });

  } catch (error) {
    logger.error('Erro ao verificar token:', { error });
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
};

// Criar router Express
const createRouter = () => Router();
const router = createRouter();

// Registrar rotas
router.get('/', async (req, res) => await verifyTokenHandler(req, res));

export { router }; 