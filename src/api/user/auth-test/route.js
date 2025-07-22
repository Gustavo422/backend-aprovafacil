import express from 'express';
import * as jwt from 'jsonwebtoken';
import { supabase } from '../../../config/supabase.js';
import { logger } from '../../../utils/logger.js';

const router = express.Router();

// Endpoint para testar autenticação
router.get('/', async (req, res) => {
  try {
    console.log('[DEBUG] Teste de autenticação - Headers:', req.headers);
    
    // Extrair token do cabeçalho Authorization
    const authHeader = req.headers.authorization;
    let token = null;
    
    // Tentar extrair do cabeçalho Authorization
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      } else if (parts.length === 1) {
        token = parts[0];
      }
    }
    
    // Tentar extrair do cookie
    if (!token && req.headers.cookie) {
      const cookies = {};
      req.headers.cookie.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          cookies[key] = value;
        }
      });
      
      if (cookies.auth_token) {
        token = cookies.auth_token;
      }
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não encontrado',
        status: 401
      });
    }
    
    // Decodificar token sem verificar
    let decoded;
    try {
      decoded = jwt.decode(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        status: 401,
        error: error.message
      });
    }
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token não pôde ser decodificado',
        status: 401
      });
    }
    
    // Extrair ID do usuário
    const userId = decoded.userId || decoded.id || decoded.sub || (decoded.user && decoded.user.id);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ID do usuário não encontrado no token',
        status: 401,
        decodedToken: decoded
      });
    }
    
    // Buscar usuário no banco
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, role')
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .single();
    
    if (error || !usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado',
        status: 401,
        userId: userId,
        error: error ? error.message : null
      });
    }
    
    // Sucesso
    return res.json({
      success: true,
      message: 'Autenticação bem-sucedida',
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      },
      token: {
        preview: token.substring(0, 20) + '...',
        decoded: decoded
      }
    });
    
  } catch (error) {
    logger.error('Erro no teste de autenticação', 'backend', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      status: 500,
      error: error.message
    });
  }
});

export default router;