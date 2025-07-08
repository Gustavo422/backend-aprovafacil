import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';
// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente do Supabase não configuradas');
    console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);
// Extensão da interface Request para incluir o usuário
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        nome: string;
    };
}
// Middleware de logging de requisições
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`, undefined, {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
    });
    next();
};
// Middleware de rate limiting simples
export const createRateLimit = (windowMs: number, max: number) => {
    const requests = new Map();
    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || 'unknown';
        const now = Date.now();
        const userRequests = requests.get(ip);
        if (!userRequests || now > userRequests.resetTime) {
            requests.set(ip, { count: 1, resetTime: now + windowMs });
            next();
            return;
        }
        if (userRequests.count >= max) {
            logger.warn(`Rate limit excedido para IP: ${ip}`, undefined, {
                ip,
                url: req.originalUrl,
                userAgent: req.get('User-Agent')
            });
            res.status(429).json({
                error: 'Muitas requisições. Tente novamente mais tarde.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
            return;
        }
        userRequests.count++;
        next();
    };
};
// Middleware de autenticação
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Tentativa de acesso sem token de autenticação', undefined, {
                ip: req.ip,
                url: req.originalUrl,
                userAgent: req.get('User-Agent')
            });
            res.status(401).json({
                error: 'Token de autenticação necessário',
                code: 'AUTH_TOKEN_REQUIRED'
            });
            return;
        }
        const token = authHeader.substring(7);
        // Verificar token no Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            logger.warn('Token de autenticação inválido', undefined, {
                ip: req.ip,
                url: req.originalUrl,
                error: error?.message
            });
            res.status(401).json({
                error: 'Token de autenticação inválido',
                code: 'INVALID_TOKEN'
            });
            return;
        }
        // Buscar dados adicionais do usuário
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('id, email, role, nome')
            .eq('id', user.id)
            .single();
        if (profileError) {
            logger.error('Erro ao buscar perfil do usuário', undefined, {
                userId: user.id,
                error: profileError.message
            });
            res.status(500).json({
                error: 'Erro interno do servidor',
                code: 'USER_PROFILE_ERROR'
            });
            return;
        }
        // Adicionar usuário à requisição
        req.user = {
            id: userProfile.id,
            email: userProfile.email,
            role: userProfile.role,
            nome: userProfile.nome
        };
        logger.info('Usuário autenticado com sucesso', undefined, {
            userId: userProfile.id,
            email: userProfile.email,
            role: userProfile.role
        });
        next();
    }
    catch (error) {
        logger.error('Erro no middleware de autenticação', undefined, {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            ip: req.ip,
            url: req.originalUrl
        });
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'AUTH_ERROR'
        });
    }
};
// Middleware de autorização para administradores
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Primeiro verificar autenticação
        await requireAuth(req, res, (err) => {
            if (err) {
                next(err);
                return;
            }
            // Verificar se o usuário é administrador
            if (!req.user || req.user.role !== 'admin') {
                logger.warn('Tentativa de acesso administrativo sem permissão', undefined, {
                    userId: req.user?.id,
                    email: req.user?.email,
                    role: req.user?.role,
                    ip: req.ip,
                    url: req.originalUrl
                });
                res.status(403).json({
                    error: 'Acesso negado. Permissão de administrador necessária.',
                    code: 'ADMIN_REQUIRED'
                });
                return;
            }
            logger.info('Acesso administrativo autorizado', undefined, {
                userId: req.user.id,
                email: req.user.email,
                ip: req.ip,
                url: req.originalUrl
            });
            next();
        });
    }
    catch (error) {
        logger.error('Erro no middleware de autorização administrativa', undefined, {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            ip: req.ip,
            url: req.originalUrl
        });
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'AUTH_ERROR'
        });
    }
};
// Middleware de autorização para usuários autenticados ou administradores
export const requireAuthOrAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Primeiro verificar autenticação
        await requireAuth(req, res, (err) => {
            if (err) {
                next(err);
                return;
            }
            // Permitir acesso se for admin ou se o usuário estiver acessando seus próprios dados
            if (req.user?.role === 'admin') {
                next();
                return;
            }
            // Para outros casos, verificar se o usuário está acessando seus próprios dados
            const resourceUserId = req.params['userId'] || req.body['userId'];
            if (resourceUserId && req.user?.id === resourceUserId) {
                next();
                return;
            }
            logger.warn('Tentativa de acesso não autorizado', undefined, {
                userId: req.user?.id,
                email: req.user?.email,
                role: req.user?.role,
                resourceUserId,
                ip: req.ip,
                url: req.originalUrl
            });
            res.status(403).json({
                error: 'Acesso negado. Você só pode acessar seus próprios dados.',
                code: 'ACCESS_DENIED'
            });
        });
    }
    catch (error) {
        logger.error('Erro no middleware de autorização', undefined, {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            ip: req.ip,
            url: req.originalUrl
        });
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'AUTH_ERROR'
        });
    }
};
// Exportar rate limit pré-configurado
export const rateLimit = createRateLimit(15 * 60 * 1000, 100); // 100 requests por 15 minutos
// Exportar objeto default para compatibilidade
export default {
    requestLogger,
    rateLimit,
    requireAuth,
    requireAdmin,
    requireAuthOrAdmin,
    createRateLimit
};
