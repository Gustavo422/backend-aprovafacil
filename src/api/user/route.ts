import { Request, Response } from 'express';

/**
 * GET /api/user/health - Health check for user routes
 */
export const getUserHealthHandler = async (req: Request, res: Response) => {
  return res.json({ 
    success: true,
    data: {
      status: 'ok', 
      message: 'User routes migrated to main auth system', 
    },
  });
}; 

// Criar router Express
import { Router } from 'express';

const router = Router();

// Registrar rotas
router.get('/health', getUserHealthHandler);

export { router };
