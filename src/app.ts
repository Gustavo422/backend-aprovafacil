// Aplicação principal do AprovaFácil Backend - Versão Atualizada
import express, { type Request, type Response, type NextFunction, type Router } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { apiVersionRewriteMiddleware, apiDeprecationHeadersMiddleware } from './middleware/api-versioning.middleware.js';

// Importar configurações e serviços
import { validateEnvironment } from './config/environment.js';
import { supabase } from './config/supabase-unified.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LogService } from './core/utils/log.service.js';
import { CacheService } from './core/utils/cache.service.js';
import { CacheManager } from './core/utils/cache-manager.js';
import cacheConfig from './config/cache.config.js';
import { UsuarioRepository } from './modules/usuarios/usuario.repository.js';
import { UsuarioService } from './modules/usuarios/usuario.service.js';
// Legacy GuruAprovacaoService removido após migração para módulo guru
import { AdminService } from './modules/admin/admin.service.js';
import { EnhancedAuthService } from './auth/enhanced-auth.service.js';
import { AuthServiceAdapter } from './auth/auth-service-adapter.js';
import { createAdminRoutes } from './routes/admin.routes.js';
import type { Usuario } from './shared/types/index.js';
import { debugRequestMiddleware } from './core/utils/debug-logger.js';
import { createRequestLoggerMiddleware, getEnhancedLoggingService, ConsoleTransport, LogLevel } from './lib/logger.js';
import { 
  optimizedAuthMiddleware,
} from './middleware/optimized-auth.middleware.js';
import { 
  globalConcursoFilterMiddleware,
  checkConcursoAccessMiddleware, 
} from './middleware/global-concurso-filter.middleware.js';

// Importar rotas da pasta api
import { router as simuladosRoutes, v1Router as simuladosV1Routes } from './api/simulados/route.js';
import * as flashcardsRoutes from './api/flashcards/route.js';
import * as questoesSemanaisRoutes from './api/questoes-semanais/route.js';
import * as planoEstudosRoutes from './api/plano-estudos/route.js';
import * as mapaAssuntosRoutes from './api/mapa-assuntos/route.js';
import * as concursoCategoriasRoutes from './api/concurso-categorias/route.js';
import * as categoriaDisciplinasRoutes from './api/categoria-disciplinas/route.js';
import * as estatisticasRoutes from './api/estatisticas/route.js';
import userRoutes from './api/user/route.js';
import userConcursoPreferenceRoutes from './api/user/concurso-preference/route.js';
import userAuthTestRoutes from './api/user/auth-test/route.js';
import tokenDebugRoutes from './api/auth/token-debug/route.js';
import * as dashboardEnhancedStatsRoutes from './api/dashboard/enhanced-stats/route.js';
import * as dashboardActivitiesRoutes from './api/dashboard/activities/route.js';
import * as dashboardStatsRoutes from './api/dashboard/stats/route.js';
import * as guruActivitiesAuxRoutes from './api/guru/activities/route.js';
import * as conteudoFiltradoRoutes from './api/conteudo/filtrado/route.js';
import * as verifyTokenRoutes from './api/auth/verify-token/route.js';
import * as concursosRoutes from './api/concursos/route.js';
import { healthCheckHandler } from './api/health/route.js';
import { listCategoriasHandler, getCategoriaByIdHandler } from './api/categorias/route.js';
import { guruFeatureFlagMiddleware } from './middleware/guru-feature-flag.middleware.js';

// Tipo para request autenticada
interface RequestComUsuario extends Request {
  usuario: Usuario;
}

// Tipo para request com usuário do middleware - compatível com optimizedAuthMiddleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    nome: string; // Obrigatório conforme definido no middleware
  };
}

// Executar validação de ambiente ANTES de tudo
validateEnvironment();

class AprovaFacilApp {
  public app: express.Application;
  private logService!: LogService;
  private cacheService!: CacheService;
  private cacheManager!: CacheManager;
  private enhancedAuthService!: EnhancedAuthService;
  private authService!: AuthServiceAdapter;
  private usuarioService!: UsuarioService;
  // private guruAprovacaoService!: unknown;
  private adminService!: AdminService;
  private readonly supabase: SupabaseClient;

  constructor() {
    this.app = express();
    
    // Configurar trust proxy para resolver warning do rate limit
    this.app.set('trust proxy', 1);
    
    // A inicialização do Supabase agora é feita diretamente
    this.supabase = supabase;

    this.initializeServices();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeServices(): void {
    // Serviços agora usam a instância `this.supabase`
    this.logService = new LogService(this.supabase, 'BACKEND');
    
    this.cacheService = new CacheService(this.supabase, this.logService);
    
    this.cacheManager = CacheManager.getInstance(
      cacheConfig.provider,
      this.logService,
      this.supabase,
    );

    const usuarioRepository = new UsuarioRepository(this.logService);

    this.enhancedAuthService = new EnhancedAuthService(this.supabase, {
      jwtSecret: process.env.JWT_SECRET ?? '',
      accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY ?? '900', 10), // 15 minutos por padrão (seguro)
      refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY ?? '604800', 10), // 7 dias por padrão
    });

    this.authService = new AuthServiceAdapter(this.enhancedAuthService);
    
    this.usuarioService = new UsuarioService(
      usuarioRepository,
      this.authService,
    );
    // Serviço legado do Guru removido; nova orquestração via controllers/services de `modules/guru`
    this.adminService = new AdminService(
      this.logService,
      this.cacheManager.getCacheService(),
      usuarioRepository,
      this.supabase,
    );

    this.logService.info('Serviços inicializados com sucesso').catch((error) => {
      console.error('Erro ao logar inicialização de serviços:', error);
    });
  }

  private initializeMiddlewares(): void {
    // Inicializar transport do logger aprimorado para console
    try {
      const els = getEnhancedLoggingService();
      els.addTransport(new ConsoleTransport({ minLevel: LogLevel.INFO }));
    } catch (e) {
      console.warn('Falha ao inicializar EnhancedLoggingService, seguindo sem transport dedicado:', e);
    }
    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL ?? '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    }));

    // Compressão
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por IP por janela
      message: {
        success: false,
        error: 'Muitas requisições. Tente novamente em 15 minutos.',
        codigo: 'RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          this.logService.info('HTTP Request', { message: message.trim() }).catch((error) => {
            console.error('Erro ao logar request HTTP:', error);
          });
        },
      },
    }));

    // Observabilidade mínima: logs estruturados com requestId/correlationId e tempo de resposta
    this.app.use(createRequestLoggerMiddleware({
      logBody: false,
      logHeaders: false,
      logResponseBody: false,
      logResponseTime: true,
      skip: (req) => (req.originalUrl ?? req.url).startsWith('/api/health'),
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    // Cookie parsing (necessário para ler accessToken/refreshToken dos cookies)
    this.app.use(cookieParser());
    
    // Debug middleware
    this.app.use(debugRequestMiddleware);

    // Versionamento e depreciação
    this.app.use(apiDeprecationHeadersMiddleware);
    this.app.use(apiVersionRewriteMiddleware);

    // Middleware global de filtro de concurso (inclui autenticação automática)
    this.app.use('/api', globalConcursoFilterMiddleware); // eslint-disable-line @typescript-eslint/no-misused-promises
    
    // Middleware de verificação de acesso a recursos específicos
    this.app.use('/api', checkConcursoAccessMiddleware); // eslint-disable-line @typescript-eslint/no-misused-promises
  }

  private initializeRoutes(): void {
    // Rota de health check
    // this.app.use('/api/monitor', monitorRoutes); // REMOVIDO

    // Rotas de autenticação avançadas
    this.app.post('/api/auth/login', (req, res, next) => {
      (async () => {
        try {
          const { email, senha, rememberMe, deviceName } = req.body as {
            email: string;
            senha: string;
            rememberMe?: boolean;
            deviceName?: string;
          };
          const ipAddress = req.ip ?? req.connection.remoteAddress ?? 'unknown';
          const userAgent = req.get('User-Agent');
          
          // Gerar device fingerprint básico
          const deviceFingerprint = this.generateDeviceFingerprint(req);

          const resultado = await this.enhancedAuthService.login({
            email,
            password: senha,
            rememberMe,
            deviceFingerprint,
            deviceName: deviceName ?? this.extractDeviceName(userAgent),
            ipAddress,
            userAgent,
          });

          if (resultado.success && resultado.accessToken) {
            const accessMaxAgeMs = (parseInt(process.env.JWT_ACCESS_EXPIRY ?? '900', 10)) * 1000;
            const refreshMaxAgeMsRemember = (parseInt(process.env.JWT_REFRESH_EXPIRY ?? '604800', 10)) * 1000;
            // Definir cookies seguros
            res.cookie('accessToken', resultado.accessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: accessMaxAgeMs, // alinhado ao JWT_ACCESS_EXPIRY
            });

            res.cookie('refreshToken', resultado.refreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: rememberMe ? refreshMaxAgeMsRemember : 604800000, // 7 dias se não lembrar
            });
          }

          res.json(resultado);
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    // Rota para validar token e obter dados do usuário
    this.app.get('/api/auth/me', (req, res, next) => {
      (async () => {
        try {
          const authHeader = req.headers.authorization;
          const cookieToken = (req.cookies as { accessToken?: string } | undefined)?.accessToken;
          
          const token = authHeader?.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : cookieToken;

          if (!token) {
            res.status(401).json({
              success: false,
              error: { message: 'Token de autenticação necessário', code: 'TOKEN_REQUIRED' },
            });
            return;
          }
          
          const validation = await this.enhancedAuthService.validateAccessToken(token);
          if (!validation.valid) {
            res.status(401).json({
              success: false,
              error: { message: validation.error ?? 'Token inválido', code: 'INVALID_TOKEN' },
            });
            return;
          }

          res.json({
            success: true,
            data: validation.user,
            message: 'Dados do usuário obtidos com sucesso',
          });
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    // Rota para refresh de token
    this.app.post('/api/auth/refresh', (req, res, next) => {
      (async () => {
        try {
          const refreshToken = (req.cookies as { refreshToken?: string } | undefined)?.refreshToken ?? (req.body as { refreshToken?: string } | undefined)?.refreshToken;
          const ipAddress = req.ip ?? req.connection.remoteAddress ?? 'unknown';
          const userAgent = req.get('User-Agent');

          if (!refreshToken) {
            res.status(401).json({
              success: false,
              error: { message: 'Refresh token necessário', code: 'MISSING_REFRESH_TOKEN' },
            });
            return;
          }

          const resultado = await this.enhancedAuthService.refreshToken(refreshToken, ipAddress, userAgent);
          
          if (resultado.success && resultado.accessToken) {
            const accessMaxAgeMs = (parseInt(process.env.JWT_ACCESS_EXPIRY ?? '900', 10)) * 1000;
            res.cookie('accessToken', resultado.accessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: accessMaxAgeMs, // alinhado ao JWT_ACCESS_EXPIRY
            });
          }

          res.json(resultado);
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    // Rota para logout
    this.app.post('/api/auth/logout', (req, res, next) => {
      (async () => {
        try {
          const token = (req.cookies as { accessToken?: string }).accessToken ?? 
            (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
          const usuarioId = (req.body as { usuarioId?: string }).usuarioId;

          if (token && usuarioId) {
            await this.enhancedAuthService.logout(token, usuarioId);
          }

          // Limpar cookies
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');

          res.json({
            success: true,
            message: 'Logout realizado com sucesso',
          });
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    // Rota para logout de todos os dispositivos
    this.app.post('/api/auth/logout-all', optimizedAuthMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void, (req: Request, res: Response, next: NextFunction) => {
      (async () => {
        try {
          const usuarioId = (req as unknown as AuthenticatedRequest).user?.id ?? '';
          const resultado = await this.enhancedAuthService.logoutAllSessions(usuarioId);
          res.json(resultado);
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    // Rota para listar sessões ativas
    this.app.get('/api/auth/sessions', optimizedAuthMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void, (req: Request, res: Response, next: NextFunction) => {
      (async () => {
        try {
          const usuarioId = (req as unknown as AuthenticatedRequest).user?.id ?? '';
          const resultado = await this.enhancedAuthService.getUserSessions(usuarioId);
          res.json({ success: true, sessions: resultado });
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    // Rota para encerrar sessão específica
    this.app.delete('/api/auth/sessions/:sessionId', optimizedAuthMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void, (req: Request, res: Response, next: NextFunction) => {
      (async () => {
        try {
          const usuarioId = (req as unknown as AuthenticatedRequest).user?.id ?? '';
          const sessionId = req.params.sessionId;
          if (!usuarioId || !sessionId) {
            res.status(400).json({
              success: false,
              error: 'ID do usuário e ID da sessão são obrigatórios',
            });
            return;
          }
          const result = await this.enhancedAuthService.revokeSession(usuarioId, sessionId);
          res.json(result);
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    // Rotas de recuperação de senha removidas: métodos não implementados em AuthService

    // Rotas protegidas de usuários
    this.app.get('/api/protected/usuario/perfil', (req, res, next) => {
      (async () => {
        try {
          const usuarioId = (req as RequestComUsuario).usuario.id;
          const resultado = await this.usuarioService.buscarPorId(usuarioId);
          res.json(resultado);
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    this.app.put('/api/protected/usuario/perfil', (req, res, next) => {
      (async () => {
        try {
          const usuarioId = (req as RequestComUsuario).usuario.id;
          const resultado = await this.usuarioService.atualizarPerfil(usuarioId, req.body as Record<string, unknown>);
          res.json(resultado);
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    this.app.get('/api/protected/usuario/estatisticas', (req, res, next) => {
      (async () => {
        try {
          const usuarioId = (req as RequestComUsuario).usuario.id;
          const resultado = await this.usuarioService.obterEstatisticas(usuarioId);
          res.json(resultado);
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    this.app.post('/api/protected/usuario/configuracao-inicial', (req, res, next) => {
      (async () => {
        try {
          const usuarioId = (req as RequestComUsuario).usuario.id;
          const { concurso_id, horas_estudo, tempo_prova } = req.body as {
            concurso_id: string;
            horas_estudo: number;
            tempo_prova: number;
          };
          const resultado = await this.usuarioService.configuracaoInicial(
            usuarioId, 
            concurso_id, 
            horas_estudo, 
            tempo_prova,
          );
          res.json(resultado);
        } catch (error) {
          next(error);
        }
      })().catch(next);
    });

    // Rotas legadas do Guru removidas em favor do novo módulo `modules/guru` (controllers e rotas versionadas)

    // Rotas administrativas completas - TODOS OS INSERTS ESTÃO AQUI
    this.app.use('/api/admin', createAdminRoutes());

    // Endpoint para testar conexão com Supabase
    this.app.get('/api/setup/test-connection', (req, res) => {
      (async () => {
        try {
          // Testar listagem de usuários
          const { data: users, error: listError } = await this.supabase.auth.admin.listUsers();
          
          if (listError) {
            res.status(500).json({
              success: false,
              error: 'Erro ao listar usuários',
              details: listError.message,
              codigo: 'ERRO_LIST_USERS',
            });
            return;
          }

          res.json({
            success: true,
            message: 'Conexão com Supabase funcionando',
            usersCount: users.users.length,
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurada' : 'Não configurada',
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido',
          });
        }
      })().catch((error) => {
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor',
          details: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      });
    });

    // Endpoint para limpar usuário admin anterior (para testes)
    this.app.delete('/api/setup/clear-admin', (req, res) => {
      (async () => {
        try {
          const { email } = req.body as { email?: string };
          
          if (!email) {
            res.status(400).json({
              success: false,
              error: 'Email é obrigatório',
              codigo: 'EMAIL_OBRIGATORIO',
            });
            return;
          }

          // Remover da tabela usuarios
          const { error: dbError } = await this.supabase
            .from('usuarios')
            .delete()
            .eq('email', email);

          if (dbError) {
            this.logService.erro('Erro ao remover usuário da tabela', dbError as Error).catch((logError) => {
              console.error('Erro ao logar erro de remoção:', logError);
            });
          }

          // Remover do sistema de autenticação
          const { data: authUsers } = await this.supabase.auth.admin.listUsers();
          const userToDelete = (authUsers.users).find((u: { email?: string }) => u.email === email);
          
          if (userToDelete) {
            const { error: authError } = await this.supabase.auth.admin.deleteUser(userToDelete.id);
            if (authError) {
              this.logService.erro('Erro ao remover usuário do Auth', authError as Error).catch((logError) => {
                console.error('Erro ao logar erro de auth:', logError);
              });
            }
          }

          res.json({
            success: true,
            message: 'Usuário removido com sucesso',
          });
        } catch (error) {
          this.logService.erro('Erro ao remover usuário', error as Error).catch((logError) => {
            console.error('Erro ao logar erro geral:', logError);
          });
          res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            codigo: 'ERRO_INTERNO',
          });
        }
      })().catch(() => {
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor',
          codigo: 'ERRO_INTERNO',
        });
      });
    });

    // Endpoint especial para criar o primeiro admin (sem autenticação)
    // REMOVIDO POR SOLICITAÇÃO

    // Registrar rotas da pasta api (não versionadas – com headers de depreciação)
    this.app.use('/api/simulados', simuladosRoutes);
    this.app.use('/api/flashcards', flashcardsRoutes.router);
    this.app.use('/api/questoes-semanais', questoesSemanaisRoutes.router); // ⚠️ DEPRECATED - será removida em 2024-06-01
    this.app.use('/api/plano-estudos', planoEstudosRoutes.router);
    this.app.use('/api/mapa-assuntos', mapaAssuntosRoutes.router);
    this.app.use('/api/concurso-categorias', concursoCategoriasRoutes.router);
    this.app.use('/api/categoria-disciplinas', categoriaDisciplinasRoutes.router);
    this.app.use('/api/estatisticas', estatisticasRoutes.router);
    this.app.use('/api/concursos', concursosRoutes.router);
    this.app.use('/api/user', userRoutes as Router);  
    this.app.use('/api/user/concurso-preference', userConcursoPreferenceRoutes);
    this.app.use('/api/user/auth-test', userAuthTestRoutes);
    this.app.use('/api/auth/token-debug', tokenDebugRoutes);
    this.app.use('/api/auth/verify-token', verifyTokenRoutes.router);
    this.app.use('/api/dashboard/enhanced-stats', dashboardEnhancedStatsRoutes.router);
    this.app.use('/api/dashboard/activities', dashboardActivitiesRoutes.router);
    this.app.use('/api/dashboard/stats', dashboardStatsRoutes.router);
    this.app.use('/api/conteudo/filtrado', conteudoFiltradoRoutes.router);

    // Rotas versionadas (v1)
    this.app.use('/api/v1/simulados', simuladosV1Routes);
    this.app.use('/api/v1/flashcards', flashcardsRoutes.router);
    this.app.use('/api/v1/questoes-semanais', questoesSemanaisRoutes.router); // ⚠️ DEPRECATED - será removida em 2024-06-01
    this.app.use('/api/v1/plano-estudos', planoEstudosRoutes.router);
    this.app.use('/api/v1/mapa-assuntos', mapaAssuntosRoutes.router);
    this.app.use('/api/v1/concurso-categorias', concursoCategoriasRoutes.router);
    this.app.use('/api/v1/categoria-disciplinas', categoriaDisciplinasRoutes.router);
    this.app.use('/api/v1/estatisticas', estatisticasRoutes.router);
    this.app.use('/api/v1/concursos', concursosRoutes.router);
    this.app.use('/api/v1/user', userRoutes as Router);  
    this.app.use('/api/v1/user/concurso-preference', userConcursoPreferenceRoutes);
    this.app.use('/api/v1/user/auth-test', userAuthTestRoutes);
    this.app.use('/api/v1/auth/token-debug', tokenDebugRoutes);
    this.app.use('/api/v1/auth/verify-token', verifyTokenRoutes.router);
    this.app.use('/api/v1/dashboard/enhanced-stats', dashboardEnhancedStatsRoutes.router);
    this.app.use('/api/v1/dashboard/activities', dashboardActivitiesRoutes.router);
    this.app.use('/api/v1/dashboard/stats', dashboardStatsRoutes.router);
    this.app.use('/api/v1/conteudo/filtrado', conteudoFiltradoRoutes.router);

    // Aliases versionados específicos do módulo Guru (mantendo compatibilidade)
    // Com feature flag para suportar rollout/rollback rápidos
    this.app.use('/api/guru/v1', guruFeatureFlagMiddleware);
    // Removido alias de rollout para Simulados: um único caminho oficial via v1

    this.app.use('/api/guru/v1/dashboard/enhanced-stats', dashboardEnhancedStatsRoutes.router);
    this.app.use('/api/guru/v1/dashboard/activities', dashboardActivitiesRoutes.router);
    this.app.use('/api/guru/v1/activities', guruActivitiesAuxRoutes.router);

    // Rotas adicionais
    this.app.get('/api/health', healthCheckHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
    this.app.get('/api/categorias', listCategoriasHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
    this.app.get('/api/categorias/:id', getCategoriaByIdHandler); // eslint-disable-line @typescript-eslint/no-misused-promises

    // Rota 404
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Rota não encontrada',
        codigo: 'ROTA_NAO_ENCONTRADA',
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use((error: Error, req: Request, res: Response, _next: NextFunction) => { // eslint-disable-line @typescript-eslint/no-unused-vars
      const correlationId = req.get('x-correlation-id') ?? undefined;
      if (correlationId) res.setHeader('x-correlation-id', correlationId);
      const requestIdHeader = res.getHeader('x-request-id');
      const requestId = Array.isArray(requestIdHeader)
        ? (requestIdHeader[0] as string)
        : (requestIdHeader as string | undefined);

      this.logService.erro('Erro na aplicação', error, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId,
        correlationId,
      }).catch((logError) => {
        console.error('Erro ao logar erro da aplicação:', logError);
      });
      res.status(500).json({
        success: false,
        error: error.message,
        codigo: 'ERRO_INTERNO',
        code: 'INTERNAL_ERROR',
        requestId,
        correlationId,
      });
    });
  }

  /**
   * Gerar fingerprint básico do dispositivo
   */
  private generateDeviceFingerprint(req: Request): string {
    const userAgent = req.get('User-Agent') ?? '';
    const acceptLanguage = req.get('Accept-Language') ?? '';
    const acceptEncoding = req.get('Accept-Encoding') ?? '';
    
    // Criar um hash simples baseado nos headers
    const fingerprint = Buffer.from(`${userAgent}:${acceptLanguage}:${acceptEncoding}`).toString('base64');
    return fingerprint.substring(0, 32); // Limitar tamanho
  }

  /**
   * Extrair nome do dispositivo do user agent
   */
  private extractDeviceName(userAgent?: string): string {
    if (!userAgent) return 'Dispositivo Desconhecido';
    
    // Detectar tipo de dispositivo
    if (userAgent.includes('Mobile')) return 'Dispositivo Móvel';
    if (userAgent.includes('Tablet')) return 'Tablet';
    if (userAgent.includes('Windows')) return 'Computador Windows';
    if (userAgent.includes('Mac')) return 'Computador Mac';
    if (userAgent.includes('Linux')) return 'Computador Linux';
    if (userAgent.includes('Chrome')) return 'Navegador Chrome';
    if (userAgent.includes('Firefox')) return 'Navegador Firefox';
    if (userAgent.includes('Safari')) return 'Navegador Safari';
    
    return 'Navegador Web';
  }

  public async start(port = 5000): Promise<void> {
    try {
      this.logService.info('Iniciando servidor...').catch((error) => {
        console.error('Erro ao logar início do servidor:', error);
      });
      // A validação de conexão agora é implícita na inicialização do SupabaseManager.
      // A aplicação não iniciará se as credenciais estiverem erradas.
      await new Promise<void>((resolve, reject) => {
        const server = this.app.listen(port, '0.0.0.0', () => {
          this.logService.info(`Servidor iniciado com sucesso na porta ${port}`, {
            port,
            ambiente: process.env.NODE_ENV ?? 'development',
            versao_node: process.version,
          }).catch((error) => {
            console.error('Erro ao logar início do servidor:', error);
          });
          resolve();
        });
        
        server.on('error', (error) => {
          reject(error);
        });
      });
      this.logService.info('Método start() concluído').catch((error) => {
        console.error('Erro ao logar conclusão do start():', error);
      });
    } catch (error) {
      this.logService.erro('Erro no método start():', error as Error).catch((logError) => {
        console.error('Erro ao logar erro do start():', logError);
      });
      this.logService.erro('Erro ao iniciar servidor', error as Error).catch((logError) => {
        console.error('Erro ao logar erro de inicialização:', logError);
      });
      throw new Error('Falha na inicialização da aplicação');
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

export default AprovaFacilApp;