import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

export const verifyResetTokenHandler = async (req: Request, res: Response) => {
  try {
    const { accessToken, refreshToken } = req.body;

    // Validação básica
    if (!accessToken || !refreshToken) {
      return res.status(400).json({
        valid: false,
        error: {
          code: 'MISSING_TOKENS',
          message: 'Tokens de acesso são obrigatórios',
        },
      });
    }

    try {
      // Definir a sessão com os tokens fornecidos
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error || !data.user) {
        logger.warn('Token de reset inválido', {
          error: error?.message,
          hasUser: !!data.user,
        });

        return res.json({
          valid: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token inválido ou expirado',
          },
        });
      }

      logger.info('Token de reset verificado com sucesso', {
        usuarioId: data.user.id,
      });

      return res.json({
        valid: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      });

    } catch (tokenError) {
      logger.warn('Erro ao verificar token de reset', {
        error: tokenError,
      });

      return res.json({
        valid: false,
        error: {
          code: 'TOKEN_VERIFICATION_FAILED',
          message: 'Falha na verificação do token',
        },
      });
    }

  } catch (error) {
    logger.error('Erro ao verificar token de reset:', error);
    return res.status(500).json({
      valid: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor. Tente novamente.',
      },
    });
  }
};



