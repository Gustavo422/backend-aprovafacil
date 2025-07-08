import express, { Request, Response } from 'express';
import { AuthService } from '../../../features/auth/auth.service.js';
import { Validator, RegisterSchema } from '../../../core/validation/index.js';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

// POST - Registro
router.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body;
        
        // Validação usando Zod
        const validation = Validator.validate(RegisterSchema, body);
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

        const { email, senha, nome } = validation.data;

        // Usar o AuthService
        const authService = new AuthService();
        const user = await authService.register({
            id: '',
            email,
            senha,
            token: ''
        });

        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            user: {
                id: user.id,
                email: user.email,
                nome: nome
            }
        });
    } catch (error) {
        console.error('Erro no registro:', error);
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
