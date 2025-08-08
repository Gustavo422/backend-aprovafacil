import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getLogger } from '../lib/logging/logging-service.js';

const logger = getLogger('jwt-auth');

interface DecodedToken {
  usuarioId: string;
  email?: string;
  role?: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

interface AuthError {
  message: string;
  status: number;
  originalError?: unknown;
  expiresAt?: string;
  currentTime?: string;
  decodedToken?: DecodedToken;
}

// Debug function to avoid ESLint warnings
const debug = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV !== 'test' && process.env.DEBUG_JWT) {
    process.stdout.write(`[DEBUG] ${message}${data ? `: ${ JSON.stringify(data)}` : ''}\n`);
  }
};

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    nome?: string;
    ativo?: boolean;
    primeiro_login?: boolean;
    is_admin?: boolean;
  };
}

/**
 * Middleware de autenticação JWT customizado
 * Funciona com o sistema EnhancedAuthService
 */
export const jwtAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    debug('JWT_SECRET em uso', `${process.env.JWT_SECRET?.substring(0, 20) }...`);
    
    const authHeader = req.headers.authorization;
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const tmp = authHeader.substring(7);
        const masked = tmp.length > 8 ? `${tmp.substring(0, 4)}...${tmp.substring(tmp.length - 4)}` : '[REDACTED]';
        debug('Authorization header', `Bearer ${masked}`);
      } else {
        const masked = authHeader.length > 8 ? `${authHeader.substring(0, 4)}...${authHeader.substring(authHeader.length - 4)}` : '[REDACTED]';
        debug('Authorization header', masked);
      }
    } else {
      debug('Authorization header', 'null');
    }
    
    if (!authHeader?.startsWith('Bearer ')) {
      const error = {
        message: 'Token de autenticação não fornecido',
        status: 401,
      };
      debug('Erro: Token de autenticação não fornecido');
      throw error;
    }

    const token = authHeader.substring(7);
    const maskedToken = token.length > 8 ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : '[REDACTED]';
    debug('Token extraído', maskedToken);
    
    const jwtSecret = process.env.JWT_SECRET ?? '';
    
    if (!jwtSecret) {
      const errorMsg = 'JWT_SECRET não configurado';
      logger.error(errorMsg);
      debug(`Erro: ${errorMsg}`);
      res.status(500).json({
        success: false,
        error: 'Erro de configuração do servidor',
      });
      return;
    }
    
    debug('Iniciando decodificação do token...');

    // Tentar decodificar sem verificar primeiro
    try {
      const decodedWithoutVerify = jwt.decode(token, { complete: true });
      debug('Payload decodificado (sem verificação)', decodedWithoutVerify);
    } catch (decodeError) {
      debug('Erro ao decodificar token', decodeError);
    }

    debug('Tentando verificar token JWT...');
    
    // Verificar token JWT
    debug('Iniciando verificação do token JWT...');
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as DecodedToken;
      debug('Token JWT decodificado com sucesso', decoded);
    } catch (jwtError) {
      debug('Erro ao verificar token JWT', jwtError);
      const authError = new Error('Token inválido') as Error & { status: number; originalError: unknown };
      authError.status = 401;
      authError.originalError = jwtError;
      throw authError;
    }
    
    debug('Token JWT verificado com sucesso', decoded);

    // Verificar se o token expirou
    const currentTime = Math.floor(Date.now() / 1000);
    debug('Verificando expiração do token', { exp: decoded.exp, current: currentTime });
    
    if (decoded.exp && decoded.exp < currentTime) {
      const error = {
        message: 'Token expirado',
        status: 401,
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        currentTime: new Date().toISOString(),
      };
      debug('Erro: Token expirado', error);
      throw error;
    }

    // Verificar se o usuário tem um ID válido
    if (!decoded.usuarioId) {
      const error = {
        message: 'Token inválido: ID de usuário não encontrado',
        status: 401,
        decodedToken: decoded,
      };
      debug('Erro: ID de usuário não encontrado no token');
      throw error;
    }
    
    // Verificar se o email está presente
    if (!decoded.email) {
      debug('Aviso: Email não encontrado no token JWT');
    }
    
    // Verificar se a role está presente
    if (!decoded.role) {
      debug('Aviso: Role não encontrada no token JWT');
    }
    
    // Criar objeto de usuário
    req.user = {
      id: decoded.usuarioId,
      email: decoded.email ?? '',
      role: decoded.role ?? 'user',
      nome: decoded.nome as string ?? undefined,
      ativo: decoded.ativo as boolean ?? true,
      primeiro_login: decoded.primeiro_login as boolean ?? false,
      is_admin: decoded.is_admin as boolean ?? false,
    };
    
    debug('Usuário autenticado com sucesso', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });
    
    next();
  } catch (error) {
    const authError = error as AuthError;
    const status = authError.status ?? 401;
    const message = authError.message ?? 'Erro de autenticação';
    
    debug('Erro de autenticação JWT', { status, message, error });
    
    res.status(status).json({
      success: false,
      error: message,
      code: 'AUTH_ERROR',
    });
  }
};

export type { AuthenticatedRequest }; 