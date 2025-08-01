// Aplicação principal do AprovaFácil Backend - Versão Atualizada
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Importar configurações e serviços
import { validateEnvironment } from './config/environment.js';
import { supabase } from './config/supabase-unified.js';
import { LogService } from './core/utils/log.service.js';
import { CacheService } from './core/utils/cache.service.js';
import { CacheManager } from './core/utils/cache-manager.js';
// import { CacheProvider } from './core/utils/cache-factory.js';
import cacheConfig from './config/cache.config.js';
import { UsuarioRepository } from './modules/usuarios/usuario.repository.js';
import { UsuarioService } from './modules/usuarios/usuario.service.js';
import { GuruAprovacaoService } from './modules/guru-aprovacao/guru-aprovacao.service.js';
import { AdminService } from './modules/admin/admin.service.js';
import { EnhancedAuthService } from './auth/enhanced-auth.service.js';
import { AuthServiceAdapter } from './auth/auth-service-adapter.js';
import { createAdminRoutes } from './routes/admin.routes.js';
import { Usuario } from './shared/types/index.js';
import { debugRequestMiddleware } from './core/utils/debug-logger.js';
import { 
  optimizedAuthMiddleware, 
  adminAuthMiddleware,
  AuthenticatedRequest,
} from './middleware/optimized-auth.middleware.js';

// Importar rotas da pasta api
import * as apostilasRoutes from './api/apostilas/route.js';
import * as simuladosRoutes from './api/simulados/route.js';
import * as flashcardsRoutes from './api/flashcards/route.js';
import * as questoesSemanaisRoutes from './api/questoes-semanais/route.js';
import * as planoEstudosRoutes from './api/plano-estudos/route.js';
import * as mapaAssuntosRoutes from './api/mapa-assuntos/route.js';
import * as concursoCategoriasRoutes from './api/concurso-categorias/route.js';
import * as categoriaDisciplinasRoutes from './api/categoria-disciplinas/route.js';
import * as estatisticasRoutes from './api/estatisticas/route.js';
import * as userRoutes from './api/user/route.js';
import { router as userConcursoPreferenceRoutes } from './api/user/concurso-preference/route.js';
import userAuthTestRoutes from './api/user/auth-test/route.js';
import tokenDebugRoutes from './api/auth/token-debug/route.js';
import * as dashboardEnhancedStatsRoutes from './api/dashboard/enhanced-stats/route.js';
import * as dashboardActivitiesRoutes from './api/dashboard/activities/route.js';
import * as dashboardStatsRoutes from './api/dashboard/stats/route.js';
import * as conteudoFiltradoRoutes from './api/conteudo/filtrado/route.js';
import * as verifyTokenRoutes from './api/auth/verify-token/route.js';
import * as concursosRoutes from './api/concursos/route.js';

// Tipo para request autenticada
interface RequestComUsuario extends express.Request {
  usuario: Usuario;
}

// Executar validação de ambiente ANTES de tudo
validateEnvironment();

class AprovaFacilApp {
  public app: express.Application;
  private logService: LogService;
  private cacheService: CacheService;
  private cacheManager: CacheManager;
  private enhancedAuthService: EnhancedAuthService;
  private authService: AuthServiceAdapter;
  private usuarioService: UsuarioService;
  private guruAprovacaoService: GuruAprovacaoService;
  private adminService: AdminService;
  private supabase: import('@supabase/supabase-js').SupabaseClient;

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
      jwtSecret: process.env.JWT_SECRET || '',
      accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '2592000', 10), // 25 minutos
      refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '7776000', 10), // 7 dias
    });


    
    this.authService = new AuthServiceAdapter(this.enhancedAuthService);
    
    this.usuarioService = new UsuarioService(
      usuarioRepository,
      this.authService,
    );
    this.guruAprovacaoService = new GuruAprovacaoService(
      usuarioRepository,
      this.logService,
      this.cacheManager.getCacheService(),
      this.supabase,
    );
    this.adminService = new AdminService(
      this.logService,
      this.cacheManager.getCacheService(),
      usuarioRepository,
      this.supabase,
    );

    this.logService.info('Serviços inicializados com sucesso');
  }

  private initializeMiddlewares(): void {
    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || '*',
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
          this.logService.info('HTTP Request', { message: message.trim() });
        },
      },
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Debug middleware
    this.app.use(debugRequestMiddleware);

    // Middleware de autenticação otimizado
    this.app.use('/api/protected', optimizedAuthMiddleware);
    this.app.use('/api/admin', optimizedAuthMiddleware, adminAuthMiddleware);
  }

  private initializeRoutes(): void {
    // Rota de health check
    // this.app.use('/api/monitor', monitorRoutes); // REMOVIDO

    // Rotas de autenticação avançadas
    this.app.post('/api/auth/login', async (req, res, next) => {
      try {
        const { email, senha, rememberMe, deviceName } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent');
        
        // Gerar device fingerprint básico
        const deviceFingerprint = this.generateDeviceFingerprint(req);

        const resultado = await this.enhancedAuthService.login({
          email,
          password: senha,
          rememberMe,
          deviceFingerprint,
          deviceName: deviceName || this.extractDeviceName(userAgent),
          ipAddress,
          userAgent,
        });

        if (resultado.success) {
          // Definir cookies seguros
          res.cookie('accessToken', resultado.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 2592000000, // 30 dias
          });

          res.cookie('refreshToken', resultado.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: rememberMe ? 2592000000 : 604800000, // 30 dias ou 7 dias
          });
        }

        res.json(resultado);
      } catch (error) {
        next(error);
      }
    });

    // Rota para validar token e obter dados do usuário
    this.app.get('/api/auth/me', async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.accessToken;
        
        const token = authHeader?.startsWith('Bearer ') 
          ? authHeader.substring(7) 
          : cookieToken;

        if (!token) {
          return res.status(401).json({
            success: false,
            error: { message: 'Token de autenticação necessário', code: 'TOKEN_REQUIRED' },
          });
        }
        
        const validation = await this.enhancedAuthService.validateAccessToken(token);
        if (!validation.valid) {
          return res.status(401).json({
            success: false,
            error: { message: validation.error || 'Token inválido', code: 'INVALID_TOKEN' },
          });
        }

        res.json({
          success: true,
          data: validation.user,
          message: 'Dados do usuário obtidos com sucesso',
        });
      } catch (error) {
        next(error);
      }
    });

    // Rota para refresh de token
    this.app.post('/api/auth/refresh', async (req, res, next) => {
      try {
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent');

        if (!refreshToken) {
          return res.status(401).json({
            success: false,
            error: { message: 'Refresh token necessário', code: 'MISSING_REFRESH_TOKEN' },
          });
        }

        const resultado = await this.enhancedAuthService.refreshToken(refreshToken, ipAddress, userAgent);
        
        if (resultado.success && resultado.accessToken) {
          res.cookie('accessToken', resultado.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000, // 1 hora
          });
        }

        res.json(resultado);
      } catch (error) {
        next(error);
      }
    });

    // Rota para logout
    this.app.post('/api/auth/logout', async (req, res, next) => {
      try {
        const token = req.cookies?.accessToken || 
          (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
        const usuarioId = req.body.usuarioId;

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
    });

    // Rota para logout de todos os dispositivos
    this.app.post('/api/auth/logout-all', optimizedAuthMiddleware, async (req, res, next) => {
      try {
        const usuarioId = (req as AuthenticatedRequest).user?.id || '';
        const resultado = await this.enhancedAuthService.logoutAllSessions(usuarioId);
        res.json(resultado);
      } catch (error) {
        next(error);
      }
    });

    // Rota para listar sessões ativas
    this.app.get('/api/auth/sessions', optimizedAuthMiddleware, async (req, res, next) => {
      try {
        const usuarioId = (req as AuthenticatedRequest).user?.id || '';
        const resultado = await this.enhancedAuthService.getUserSessions(usuarioId);
        res.json({ success: true, sessions: resultado });
      } catch (error) {
        next(error);
      }
    });

    // Rota para encerrar sessão específica
    this.app.delete('/api/auth/sessions/:sessionId', optimizedAuthMiddleware, async (req, res, next) => {
      try {
        const result = await this.enhancedAuthService.revokeSession((req as AuthenticatedRequest).user?.id || '', req.params.sessionId);
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // TODO: Implementar rota de alterar senha no sistema moderno
    // this.app.post('/api/auth/alterar-senha', ...

    // Rotas de recuperação de senha removidas: métodos não implementados em AuthService

    // Rotas protegidas de usuários
    this.app.get('/api/protected/usuario/perfil', async (req, res, next) => {
      try {
        const usuarioId = (req as RequestComUsuario).usuario.id;
        const resultado = await this.usuarioService.buscarPorId(usuarioId);
        res.json(resultado);
      } catch (error) {
        next(error);
      }
    });

    this.app.put('/api/protected/usuario/perfil', async (req, res, next) => {
      try {
        const usuarioId = (req as RequestComUsuario).usuario.id;
        const resultado = await this.usuarioService.atualizarPerfil(usuarioId, req.body);
        res.json(resultado);
      } catch (error) {
        next(error);
      }
    });

    this.app.get('/api/protected/usuario/estatisticas', async (req, res, next) => {
      try {
        const usuarioId = (req as RequestComUsuario).usuario.id;
        const resultado = await this.usuarioService.obterEstatisticas(usuarioId);
        res.json(resultado);
      } catch (error) {
        next(error);
      }
    });

    this.app.post('/api/protected/usuario/configuracao-inicial', async (req, res, next) => {
      try {
        const usuarioId = (req as RequestComUsuario).usuario.id;
        const { concurso_id, horas_estudo, tempo_prova } = req.body;
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
    });

    // Rotas do Guru da Aprovação
    this.app.get('/api/protected/guru/metricas', async (req, res, next) => {
      try {
        const usuarioId = (req as RequestComUsuario).usuario.id;
        const resultado = await this.guruAprovacaoService.calcularMetricas(usuarioId);
        res.json(resultado);
      } catch (error) {
        next(error);
      }
    });

    this.app.get('/api/protected/guru/prognostico', async (req, res, next) => {
      try {
        const usuarioId = (req as RequestComUsuario).usuario.id;
        const resultado = await this.guruAprovacaoService.obterPrognostico(usuarioId);
        res.json(resultado);
      } catch (error) {
        next(error);
      }
    });

    this.app.get('/api/protected/guru/analise-detalhada', async (req, res, next) => {
      try {
        const usuarioId = (req as RequestComUsuario).usuario.id;
        const resultado = await this.guruAprovacaoService.obterAnaliseDetalhada(usuarioId);
        res.json(resultado);
      } catch (error) {
        next(error);
      }
    });

    this.app.post('/api/protected/guru/atualizar', async (req, res, next) => {
      try {
        const usuarioId = (req as RequestComUsuario).usuario.id;
        await this.guruAprovacaoService.atualizarMetricas(usuarioId);
        res.json({
          success: true,
          message: 'Métricas atualizadas com sucesso',
        });
      } catch (error) {
        next(error);
      }
    });

    // Rotas administrativas completas - TODOS OS INSERTS ESTÃO AQUI
    this.app.use('/api/admin', createAdminRoutes());

    // Endpoint para testar conexão com Supabase
    this.app.get('/api/setup/test-connection', async (req, res) => {
      try {
        // Testar listagem de usuários
        const { data: users, error: listError } = await this.supabase.auth.admin.listUsers();
        
        if (listError) {
          return res.status(500).json({
            success: false,
            error: 'Erro ao listar usuários',
            details: listError.message,
            codigo: 'ERRO_LIST_USERS',
          });
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
          error: 'Erro ao testar conexão',
          details: error instanceof Error ? error.message : 'Erro desconhecido',
          codigo: 'ERRO_CONNECTION',
        });
      }
    });

    // Endpoint para limpar usuário admin anterior (para testes)
    this.app.delete('/api/setup/clear-admin', async (req, res) => {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({
            success: false,
            error: 'Email é obrigatório',
            codigo: 'EMAIL_OBRIGATORIO',
          });
        }

        // Remover da tabela usuarios
        const { error: dbError } = await this.supabase
          .from('usuarios')
          .delete()
          .eq('email', email);

        if (dbError) {
          this.logService.erro('Erro ao remover usuário da tabela', dbError as Error);
        }

        // Remover do sistema de autenticação
        const { data: authUsers } = await this.supabase.auth.admin.listUsers();
        const userToDelete = (authUsers?.users ?? []).find((u: { email?: string }) => u.email === email);
        
        if (userToDelete) {
          const { error: authError } = await this.supabase.auth.admin.deleteUser(userToDelete.id);
          if (authError) {
            this.logService.erro('Erro ao remover usuário do Auth', authError as Error);
          }
        }

        res.json({
          success: true,
          message: 'Usuário removido com sucesso',
        });
      } catch (error) {
        this.logService.erro('Erro ao remover usuário', error as Error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor',
          codigo: 'ERRO_INTERNO',
        });
      }
    });

    // Endpoint especial para criar o primeiro admin (sem autenticação)
    // REMOVIDO POR SOLICITAÇÃO

    // Registrar rotas da pasta api
    this.app.use('/api/apostilas', apostilasRoutes.router);
    this.app.use('/api/simulados', simuladosRoutes.router);
    this.app.use('/api/flashcards', flashcardsRoutes.router);
    this.app.use('/api/questoes-semanais', questoesSemanaisRoutes.router);
    this.app.use('/api/plano-estudos', planoEstudosRoutes.router);
    this.app.use('/api/mapa-assuntos', mapaAssuntosRoutes.router);
    this.app.use('/api/concurso-categorias', concursoCategoriasRoutes.router);
    this.app.use('/api/categoria-disciplinas', categoriaDisciplinasRoutes.router);
    this.app.use('/api/estatisticas', estatisticasRoutes.router);
    this.app.use('/api/concursos', concursosRoutes.router);
    this.app.use('/api/user', userRoutes.router);
    this.app.use('/api/user/concurso-preference', userConcursoPreferenceRoutes);
    this.app.use('/api/user/auth-test', userAuthTestRoutes);
    this.app.use('/api/auth/token-debug', tokenDebugRoutes);
    this.app.use('/api/auth/verify-token', verifyTokenRoutes.router);
    this.app.use('/api/dashboard/enhanced-stats', dashboardEnhancedStatsRoutes.router);
    this.app.use('/api/dashboard/activities', dashboardActivitiesRoutes.router);
    this.app.use('/api/dashboard/stats', dashboardStatsRoutes.router);
    this.app.use('/api/conteudo/filtrado', conteudoFiltradoRoutes.router);

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
    this.app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      this.logService.erro('Erro na aplicação', error, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor',
        codigo: 'ERRO_INTERNO',
      });
    });
  }



  /**
   * Gerar fingerprint básico do dispositivo
   */
  private generateDeviceFingerprint(req: express.Request): string {
    const userAgent = req.get('User-Agent') || '';
    const acceptLanguage = req.get('Accept-Language') || '';
    const acceptEncoding = req.get('Accept-Encoding') || '';
    
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

  public async start(port: number = 5000): Promise<void> {
    try {
      this.logService.info('Iniciando servidor...');
      // A validação de conexão agora é implícita na inicialização do SupabaseManager.
      // A aplicação não iniciará se as credenciais estiverem erradas.
      this.app.listen(port, '0.0.0.0', () => {
        this.logService.info(`Servidor iniciado com sucesso na porta ${port}`, {
          port,
          ambiente: process.env.NODE_ENV || 'development',
          versao_node: process.version,
        });
      });
      this.logService.info('Método start() concluído');
    } catch (error) {
      this.logService.erro('Erro no método start():', error as Error);
      this.logService.erro('Erro ao iniciar servidor', error as Error);
      throw new Error('Falha na inicialização da aplicação');
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

export default AprovaFacilApp;