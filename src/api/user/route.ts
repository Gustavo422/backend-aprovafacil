import express from 'express';

const router = express.Router();

// TODO: Migrar rotas para o novo sistema de autenticação
// Por enquanto, estas rotas foram movidas para o app.ts principal
// usando o EnhancedAuthService e EnhancedAuthMiddleware

// Placeholder para compatibilidade
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'User routes migrated to main auth system' 
  });
});

export default router; 