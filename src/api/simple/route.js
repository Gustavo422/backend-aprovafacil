import express from 'express';
import { simpleAuthMiddleware } from '../../middleware/simple-auth.js';

const router = express.Router();

// Rota pública
router.get('/public', (req, res) => {
  res.json({
    success: true,
    message: 'Rota pública acessada com sucesso',
    timestamp: new Date().toISOString()
  });
});

// Rota protegida
router.get('/protected', simpleAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Rota protegida acessada com sucesso',
    user: req.user,
    token: req.token,
    timestamp: new Date().toISOString()
  });
});

export default router;