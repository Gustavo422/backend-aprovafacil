import express from 'express';
import { unifiedAuthMiddleware } from '../middleware/unified-auth.middleware.js';
import { createAdminAuthMiddleware } from '../middleware/admin-auth.js';
import { UsuarioRepository } from '../modules/usuarios/usuario.repository.js';
import { LogService } from '../core/utils/log.service.js';
import { supabase } from '../config/supabase-unified.js';

export const createAdminRoutes = () => {
  const router = express.Router();
  const logService = new LogService(supabase, 'ADMIN_ROUTES');
  const usuarioRepository = new UsuarioRepository(logService);
  const adminAuthMiddleware = createAdminAuthMiddleware(usuarioRepository);
  
  // Aplicar middleware de autenticação e verificação de admin em todas as rotas
  router.use(unifiedAuthMiddleware, adminAuthMiddleware);

  // Exemplo de rota: obter todos os usuários
  router.get('/users', async (_req, res) => {
    try {
      const usuarios = await usuarioRepository.buscarTodos();
      res.json(usuarios);
    } catch {
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  });

  return router;
};




