import express, { Request, Response } from 'express';
import { supabase } from '../../../config/supabase.js';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

// POST - Verificar token de reset
router.post('/', async (req: Request, res: Response) => {
    try {
        const { accessToken, refreshToken } = req.body;

        // Validação básica
        if (!accessToken || !refreshToken) {
            res.status(400).json({
                valid: false,
                error: {
                    code: 'MISSING_TOKENS',
                    message: 'Tokens de acesso são obrigatórios'
                }
            });
            return;
        }

        try {
            // Definir a sessão com os tokens fornecidos
            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (error || !data.user) {
                console.warn('Token de reset inválido', {
                    error: error?.message,
                    hasUser: !!data.user
                });

                res.json({
                    valid: false,
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Token inválido ou expirado'
                    }
                });
                return;
            }

            console.info('Token de reset verificado com sucesso', {
                userId: data.user.id
            });

            res.json({
                valid: true,
                user: {
                    id: data.user.id,
                    email: data.user.email
                }
            });

        } catch (tokenError) {
            console.warn('Erro ao verificar token de reset', {
                error: tokenError
            });

            res.json({
                valid: false,
                error: {
                    code: 'TOKEN_VERIFICATION_FAILED',
                    message: 'Falha na verificação do token'
                }
            });
        }

    } catch (error) {
        console.error('Erro inesperado na verificação de token', { error });
        
        res.status(500).json({
            valid: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Erro interno do servidor. Tente novamente.'
            }
        });
    }
});

export default router;
