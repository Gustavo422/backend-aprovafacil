import express, { Request, Response } from 'express';
import { supabase } from '../../../config/supabase.js';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

// POST - Reset de senha
router.post('/', async (req: Request, res: Response) => {
    try {
        const { password, accessToken, refreshToken } = req.body;

        // Validação básica
        if (!password || !accessToken || !refreshToken) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Senha e tokens são obrigatórios'
                }
            });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'WEAK_PASSWORD',
                    message: 'A senha deve ter pelo menos 6 caracteres'
                }
            });
            return;
        }

        try {
            // Definir a sessão com os tokens fornecidos
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (sessionError || !sessionData.user) {
                console.warn('Falha ao definir sessão para reset de senha', {
                    error: sessionError?.message
                });

                res.status(401).json({
                    success: false,
                    error: {
                        code: 'INVALID_SESSION',
                        message: 'Sessão inválida ou expirada. Solicite um novo link.'
                    }
                });
                return;
            }

            // Atualizar a senha
            const { data, error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                console.warn('Erro ao atualizar senha', {
                    userId: sessionData.user.id,
                    error: error.message
                });

                res.status(400).json({
                    success: false,
                    error: {
                        code: 'PASSWORD_UPDATE_FAILED',
                        message: 'Falha ao atualizar senha. Tente novamente.'
                    }
                });
                return;
            }

            if (data.user) {
                console.info('Senha redefinida com sucesso', {
                    userId: data.user.id,
                    email: data.user.email
                });

                res.json({
                    success: true,
                    message: 'Senha redefinida com sucesso.',
                    user: {
                        id: data.user.id,
                        email: data.user.email
                    }
                });
                return;
            }

            res.status(500).json({
                success: false,
                error: {
                    code: 'RESET_FAILED',
                    message: 'Falha ao redefinir senha. Tente novamente.'
                }
            });

        } catch (resetError) {
            console.error('Erro durante reset de senha', {
                error: resetError
            });

            res.status(500).json({
                success: false,
                error: {
                    code: 'RESET_ERROR',
                    message: 'Erro durante redefinição de senha. Tente novamente.'
                }
            });
        }

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



