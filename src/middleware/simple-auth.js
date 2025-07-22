import * as jwt from 'jsonwebtoken';
import { authConfig } from './auth-config.js';

/**
 * Middleware simplificado para autenticação JWT
 */
export function simpleAuthMiddleware(req, res, next) {
  try {
    console.log('[SIMPLE-AUTH] Iniciando autenticação');
    
    // Extrair token do cabeçalho Authorization
    const authHeader = req.headers.authorization;
    console.log('[SIMPLE-AUTH] Authorization header:', authHeader ? `${authHeader.substring(0, 15)}...` : 'não encontrado');
    
    // Tentar extrair token de diferentes fontes
    let token = null;
    
    // 1. Tentar extrair do cabeçalho Authorization
    if (authHeader) {
      // Formato esperado: "Bearer <token>" ou apenas "<token>"
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
        console.log('[SIMPLE-AUTH] Token extraído do cabeçalho Authorization (formato Bearer)');
      } else if (parts.length === 1) {
        token = parts[0];
        console.log('[SIMPLE-AUTH] Token extraído do cabeçalho Authorization (formato simples)');
      }
    }
    
    // 2. Tentar extrair do cookie
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
        console.log('[SIMPLE-AUTH] Token extraído do cookie auth_token');
      }
    }
    
    if (!token) {
      console.log('[SIMPLE-AUTH] Token não encontrado');
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }
    
    // Verificar token
    try {
      let decoded;
      
      if (authConfig.debug.ignoreSignatureInDev) {
        // Em ambiente de desenvolvimento, apenas decodificar sem verificar assinatura
        decoded = jwt.decode(token);
        console.log('[SIMPLE-AUTH] Token decodificado sem verificação (modo desenvolvimento)');
      } else {
        // Em produção, verificar assinatura
        decoded = jwt.verify(token, authConfig.jwtSecret);
        console.log('[SIMPLE-AUTH] Token verificado com sucesso');
      }
      
      if (!decoded) {
        console.log('[SIMPLE-AUTH] Token não pôde ser decodificado');
        return res.status(401).json({ error: 'Token inválido' });
      }
      
      // Extrair ID do usuário
      const userId = decoded.userId || decoded.id || decoded.sub;
      
      if (!userId) {
        console.log('[SIMPLE-AUTH] Token sem ID de usuário');
        return res.status(401).json({ error: 'Token inválido: sem ID de usuário' });
      }
      
      // Adicionar informações à requisição
      req.user = { id: userId };
      req.token = decoded;
      
      console.log('[SIMPLE-AUTH] Autenticação bem-sucedida, userId:', userId);
      next();
    } catch (error) {
      console.log('[SIMPLE-AUTH] Erro ao verificar token:', error.message);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  } catch (error) {
    console.error('[SIMPLE-AUTH] Erro no middleware:', error);
    return res.status(500).json({ error: 'Erro interno de autenticação' });
  }
}