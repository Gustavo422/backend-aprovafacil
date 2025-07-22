import express from 'express';
import * as jwt from 'jsonwebtoken';

const router = express.Router();

// Endpoint para depurar token
router.post('/', (req, res) => {
  try {
    const { token } = req.body;
    
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
      
      // Verificar se o token tem um ID de usuário
      const userId = decoded.userId || decoded.id || decoded.sub;
      
      return res.json({
        success: true,
        message: 'Token decodificado com sucesso',
        decoded,
        userId: userId || null
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Erro ao decodificar token',
        error: error.message
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

export default router;