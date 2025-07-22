import express from 'express';

const router = express.Router();

// Rota simples sem autenticação para testar
router.get('/', (req, res) => {
  try {
    // Retornar informações sobre a requisição
    res.json({
      success: true,
      message: 'Teste bem-sucedido',
      headers: req.headers,
      cookies: req.cookies || {},
      method: req.method,
      url: req.originalUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro no teste',
      error: error.message
    });
  }
});

export default router;