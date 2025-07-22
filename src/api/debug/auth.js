import express from 'express';
import * as jwt from 'jsonwebtoken';

const router = express.Router();

// Endpoint para debug de autenticação
router.get('/', (req, res) => {
  try {
    // Extrair token do cabeçalho Authorization
    const authHeader = req.headers.authorization;
    
    // Informações de debug
    const debugInfo = {
      extractedToken: authHeader ? `${authHeader.substring(0, 10)}...` : 'não encontrado',
      authHeader: authHeader || 'não encontrado',
      hasCookieHeader: !!req.headers.cookie,
      cookieHeader: req.headers.cookie || 'não encontrado',
      allHeaders: req.headers,
      url: req.protocol + '://' + req.get('host') + req.originalUrl,
      method: req.method
    };
    
    // Tentar decodificar token se existir
    if (authHeader) {
      const parts = authHeader.split(' ');
      const token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : parts[0];
      
      try {
        // Decodificar sem verificar
        const decoded = jwt.decode(token);
        if (decoded) {
          debugInfo.decodedToken = decoded;
        }
      } catch (error) {
        debugInfo.decodeError = error.message;
      }
    }
    
    // Tentar extrair token dos cookies
    if (req.headers.cookie) {
      const parseCookies = (cookieHeader) => {
        const cookies = {};
        cookieHeader.split(';').forEach(cookie => {
          const parts = cookie.trim().split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            cookies[key] = value;
          }
        });
        return cookies;
      };
      
      const cookies = parseCookies(req.headers.cookie);
      debugInfo.parsedCookies = Object.keys(cookies);
      
      // Verificar tokens em cookies específicos
      const tokenCookies = ['auth_token', 'sb-jsdabzqnyvmebsayutqe-auth-token', 'sb-127-auth-token'];
      tokenCookies.forEach(cookieName => {
        if (cookies[cookieName]) {
          debugInfo[`cookie_${cookieName}`] = `${cookies[cookieName].substring(0, 10)}...`;
          
          try {
            // Se for um token Supabase (base64)
            if (cookies[cookieName].startsWith('base64-')) {
              const base64Token = cookies[cookieName].replace(/^base64-/, '');
              const decodedBase64 = Buffer.from(base64Token, 'base64').toString();
              debugInfo[`decoded_${cookieName}`] = JSON.parse(decodedBase64);
            }
          } catch (error) {
            debugInfo[`decode_error_${cookieName}`] = error.message;
          }
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Informações de debug obtidas',
      debugInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter informações de debug',
      error: error.message
    });
  }
});

export default router;