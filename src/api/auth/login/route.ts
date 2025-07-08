import express, { Request, Response } from 'express';
import { AuthService } from '../../../features/auth/auth.service.js';
import { Validator, LoginSchema } from '../../../core/validation/index.js';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

// POST - Login
router.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body;
        
        // Validação usando Zod
        const validation = Validator.validate(LoginSchema, body);
        if (!validation.success || !validation.data) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Dados inválidos',
                    details: validation.errors
                }
            });
            return;
        }

        const { email, senha } = validation.data;

        // Usar o AuthService
        const authService = new AuthService();
        const user = await authService.login(email, senha);

        if (!user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Email ou senha incorretos'
                }
            });
            return;
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                nome: user.nome || user.email
            },
            message: 'Login realizado com sucesso'
        });
    } catch (error) {
        console.error('Erro no login:', error);
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
