import express from 'express';
import { getLogger } from '../lib/logging/logging-service.js';

const logger = getLogger('admin-example');
const router = express.Router();

interface AdminData {
  id: string;
  name: string;
  permissions: string[];
}

// Rota de exemplo para administradores
router.get('/admin-data', (req, res) => {
  try {
    const adminData: AdminData = {
      id: 'admin-001',
      name: 'Administrador',
      permissions: ['read', 'write', 'delete'],
    };

    logger.info('Dados administrativos acessados');
    res.json(adminData);
  } catch (error) {
    logger.error('Erro ao acessar dados administrativos:', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;