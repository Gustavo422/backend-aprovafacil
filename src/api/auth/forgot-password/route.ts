import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

export const forgotPasswordHandler = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'E-mail é obrigatório',
      });
    }

    // Enviar email de recuperação
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      logger.error('Erro ao enviar email de recuperação:', { error });
      return res.status(500).json({
        success: false,
        error: 'Erro ao enviar email de recuperação',
      });
    }

    // Por segurança, não revelamos se o e-mail existe ou não
    return res.json({
      success: true,
      message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.',
    });

  } catch (error) {
    logger.error('Erro ao processar requisição de recuperação de senha:', { error });
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
};



