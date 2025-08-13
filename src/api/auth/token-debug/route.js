import express from 'express';
import * as jwt from 'jsonwebtoken';

const router = express.Router();

// Endpoint para depurar token
router.post('/', (req, res) => {
  try {
    const { token } = req.body || {};
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token não fornecido'
      });
    }
    
    // Tentar decodificar o token sem verificar
    try {
      const decoded = jwt.decode(token);

      if (!decoded) {
        return res.status(400).json({
          success: false,
          message: 'Token inválido ou mal-formado'
        });
      }

      let usuarioId = null;
      if (decoded && typeof decoded === 'object') {
        const payload = decoded;
        usuarioId = payload['usuarioId'] ?? payload['id'] ?? payload['sub'] ?? null;
      }

      return res.json({
        success: true,
        message: 'Token decodificado com sucesso',
        decoded,
        usuarioId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(400).json({
        success: false,
        message: 'Erro ao decodificar token',
        error: message
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: message
    });
  }
});

export default router;