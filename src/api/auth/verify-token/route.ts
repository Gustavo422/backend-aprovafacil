import express, { Response } from 'express';
import { jwtAuthGlobal, JWTRequest } from '../../../middleware/jwt-auth-global.js';

const router = express.Router();

// GET - Verificar se o token é válido
router.get('/', jwtAuthGlobal, async (req: JWTRequest, res: Response) => {
  try {
    if (req.user) {
      return res.status(200).json({
        valid: true,
        user: {
          id: req.user.id,
          nome: req.user.nome,
          email: req.user.email,
          role: req.user.role,
          ativo: req.user.ativo,
          primeiro_login: req.user.primeiro_login
        }
      });
    } else {
      return res.status(401).json({
        valid: false,
        error: 'Token inválido ou expirado'
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erro ao verificar token:', errorMessage);
    return res.status(500).json({
      valid: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router; 