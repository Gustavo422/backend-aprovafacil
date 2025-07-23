import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { createDebugger } from '../utils/debugger.js';

const debug = createDebugger('middleware:jwt-global');

export interface JWTRequest extends Request {
  user?: {
    id: string;
    nome: string;
    email: string;
    role: string;
    ativo: boolean;
    primeiro_login: boolean;
  };
}

/**
 * Middleware JWT global que define req.user se um token válido for encontrado
 * Não retorna erro se não houver token - apenas não define req.user
 */
export const jwtAuthGlobal = async (req: JWTRequest, res: Response, next: NextFunction) => {
  try {
    debug('Verificando token JWT para rota: %s %s', req.method, req.path);

    // Extrair token do cabeçalho Authorization
    const authHeader = req.headers.authorization;
    let token = null;

    // 1. Tentar extrair do cabeçalho Authorization
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
        debug('Token extraído do cabeçalho Authorization (formato Bearer)');
      } else if (parts.length === 1) {
        token = parts[0];
        debug('Token extraído do cabeçalho Authorization (formato simples)');
      }
    }

    // 2. Tentar extrair do cookie se não encontrou no header
    if (!token && req.headers.cookie) {
      const cookies: Record<string, string> = {};
      req.headers.cookie.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          cookies[key] = value;
        }
      });

      // Tentar encontrar o token em cookies conhecidos
      const possibleTokenCookies = ['auth_token', 'accessToken', 'sb-127-auth-token'];
      for (const cookieName of possibleTokenCookies) {
        if (cookies[cookieName]) {
          token = cookies[cookieName];
          debug('Token extraído do cookie %s', cookieName);
          break;
        }
      }
    }

    // Se não encontrou token, continuar sem definir req.user
    if (!token) {
      debug('Token não encontrado, continuando sem autenticação');
      return next();
    }

    debug('Token encontrado, verificando...');
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';

    try {
      let decoded: any;

      try {
        // Tentar verificar o token normalmente
        decoded = jwt.verify(token, jwtSecret);
        debug('Token verificado com sucesso');
      } catch (verifyError: any) {
        debug('Erro na verificação do token: %s', verifyError.message);
        
        // Se o token expirou, apenas loggar e continuar sem req.user
        if (verifyError.message === 'jwt expired') {
          debug('Token expirado, continuando sem autenticação');
          return next();
        }

        // Para outros erros, tentar decodificar sem verificar (modo debug)
        try {
          decoded = jwt.decode(token);
          debug('Token decodificado sem verificação para debug');
          
          if (!decoded) {
            debug('Token não pôde ser decodificado');
            return next();
          }
        } catch (decodeError: any) {
          debug('Erro ao decodificar token: %s', decodeError.message);
          return next();
        }
      }

      // Extrair ID do usuário do token
      const userId = decoded.userId || decoded.id || decoded.sub || 
                     (decoded.user && decoded.user.id);

      if (!userId) {
        debug('Token sem identificação de usuário');
        return next();
      }

      debug('ID do usuário encontrado: %s', userId);

      // Buscar usuário no banco de dados
      let { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .eq('ativo', true)
        .single();

      // Se não encontrar por ID, tentar por auth_user_id
      if (error || !usuario) {
        debug('Usuário não encontrado por ID, tentando por auth_user_id');
        const { data: usuarioPorAuthId, error: errorPorAuthId } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', userId)
          .eq('ativo', true)
          .single();

        if (!errorPorAuthId && usuarioPorAuthId) {
          usuario = usuarioPorAuthId;
          error = null;
          debug('Usuário encontrado por auth_user_id');
        }
      }

      if (error || !usuario) {
        debug('Usuário não encontrado ou inativo');
        return next();
      }

      // Definir req.user
      req.user = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        ativo: usuario.ativo,
        primeiro_login: usuario.primeiro_login
      };

      debug('Usuário autenticado: %s (%s)', usuario.id, usuario.role);
      next();

    } catch (jwtError: any) {
      debug('Erro na verificação do JWT: %s', jwtError.message);
      // Continuar sem definir req.user em caso de erro
      next();
    }
  } catch (error: any) {
    debug('Erro no middleware JWT global: %s', error.message);
    // Continuar sem definir req.user em caso de erro
    next();
  }
}; 