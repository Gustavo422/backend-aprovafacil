import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

export const resetPasswordHandler = async (req: Request, res: Response) => {
  try {
    const { password, accessToken, refreshToken } = req.body;

    // Validação básica
    if (!password || !accessToken || !refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Senha e tokens são obrigatórios',
        },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'A senha deve ter pelo menos 6 caracteres',
        },
      });
    }

    try {
      // Definir a sessão com os tokens fornecidos
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError || !sessionData.user) {
        logger.warn('Falha ao definir sessão para reset de senha', {
          error: sessionError?.message,
        });

        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SESSION',
            message: 'Sessão inválida ou expirada. Solicite um novo link.',
          },
        });
      }

      // Atualizar a senha
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        logger.error('Erro ao atualizar senha:', { error: error.message, code: error.code });
        return res.status(500).json({
          success: false,
          error: 'Erro ao atualizar senha',
        });
      }

      if (data.user) {
        logger.info('Senha redefinida com sucesso', {
          usuarioId: data.user.id,
          email: data.user.email,
        });

        return res.json({
          success: true,
          message: 'Senha redefinida com sucesso.',
          user: {
            id: data.user.id,
            email: data.user.email,
          },
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'RESET_FAILED',
          message: 'Falha ao redefinir senha. Tente novamente.',
        },
      });

    } catch (resetError) {
      logger.error('Erro durante reset de senha', {
        error: resetError,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'RESET_ERROR',
          message: 'Erro durante redefinição de senha. Tente novamente.',
        },
      });
    }

  } catch (error) {
    logger.error('Erro ao processar reset de senha:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
};



