import express, { Request, Response } from 'express';
import { supabase } from '../../../config/supabase.js';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

// POST - Solicitar reset de senha
router.post('/', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        // Validação básica
        if (!email) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_EMAIL',
                    message: 'E-mail é obrigatório'
                }
            });
            return;
        }

        // Rate limiting por IP para reset de senha
        const clientIP = req.headers['x-forwarded-for'] as string ||
                        req.headers['x-real-ip'] as string ||
                        req.ip ||
                        'unknown';

        // Solicitar reset de senha
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password`,
        });

        if (error) {
            console.warn('Erro ao solicitar reset de senha', {
                ip: clientIP,
                email,
                error: error.message
            });

            // Por segurança, não revelamos se o e-mail existe ou não
            res.json({
                success: true,
                message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.'
            });
            return;
        }

        console.info('Reset de senha solicitado', {
            email,
            ip: clientIP
        });

        res.json({
            success: true,
            message: 'E-mail de redefinição enviado com sucesso.'
        });

    } catch (error) {
        console.error('Erro inesperado no reset de senha', { error });
        
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Erro interno do servidor. Tente novamente.'
            }
        });
    }
});

export default router;
