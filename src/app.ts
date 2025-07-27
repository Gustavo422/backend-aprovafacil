// Aplicação principal do AprovaFácil Backend - Versão Atualizada
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Importar configurações e serviços
import { SupabaseConfig } from './core/database/supabase.js';
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
import { createEnhancedAuthMiddleware, EnhancedAuthMiddleware, AuthenticatedRequest } from './middleware/enhanced-auth.middleware.js';
// import { ErrorHandler } from './core/errors/index.js';
import createAdminRoutes from './routes/admin.routes.js';
import { Usuario } from './shared/types/index.js';
import { debugRequestMiddleware } from './middleware/debug-request.js';
import { applySecurityMiddlewares } from './middleware/security.js';
import { createClient } from '@supabase/supabase-js';
import { jwtAuthGlobal } from './middleware/jwt-auth-global.js';

// Importar rotas da pasta api
// Não existe exportação concursosRoutes, remover o import
import apostilasRoutes from './api/apostilas/route.js';
import simuladosRoutes from './api/simulados/route.js';
import flashcardsRoutes from './api/flashcards/route.js';
import questoesSemanaisRoutes from './api/questoes-semanais/route.js';
import planoEstudosRoutes from './api/plano-estudos/route.js';
import mapaAssuntosRoutes from './api/mapa-assuntos/route.js';
import concursoCategoriasRoutes from './api/concurso-categorias/route.js';
import categoriaDisciplinasRoutes from './api/categoria-disciplinas/route.js';
import estatisticasRoutes from './api/estatisticas/route.js';
import userRoutes from './api/user/route.js';
import userConcursoPreferenceRoutes from './api/user/concurso-preference/route.js';
import userAuthTestRoutes from './api/user/auth-test/route.js';
import tokenDebugRoutes from './api/auth/token-debug/route.js';
import dashboardEnhancedStatsRoutes from './api/dashboard/enhanced-stats/route.js';
import dashboardActivitiesRoutes from './api/dashboard/activities/route.js';
import dashboardStatsRoutes from './api/dashboard/stats/route.js';
import conteudoFiltradoRoutes from './api/conteudo/filtrado/route.js';
import verifyTokenRoutes from './api/auth/verify-token/route.js';
import debugRoutes from './api/debug/route.js';
import testRoutes from './api/test/route.js';
import simpleRoutes from './api/simple/route.js';
import concursosRoutes from './api/concursos/route.js';

// Tipo para request autenticada
interface RequestComUsuario extends express.Request {
  usuario: Usuario;
}

class AprovaFacilApp {
  public app: express.Application;
  private logService: LogService;
  private cacheService: CacheService;
  private cacheManager: CacheManager;
  private enhancedAuthService: EnhancedAuthService;
  private enhancedAuthMiddleware: EnhancedAuthMiddleware;
  private authService: AuthServiceAdapter;
  private usuarioService: UsuarioService;
  private guruAprovacaoService: GuruAprovacaoService;
  private adminService: AdminService;
  private supabase: import('@supabase/supabase-js').SupabaseClient;

  constructor() {
    this.app = express();
    
    // Configurar trust proxy para resolver warning do rate limit
    this.app.set('trust proxy', 1);
    
    this.initializeServices();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeServices(): void {
    // Inicializar Supabase
    const supabase = SupabaseConfig.getInstance();
    this.supabase = supabase;

    // Inicializar serviços
    this.logService = new LogService(supabase, 'BACKEND');
    
    // Inicializar serviços de cache
    this.cacheService = new CacheService(supabase, this.logService);
    
    // Inicializar o cache manager com o provider configurado
    this.cacheManager = CacheManager.getInstance(
      cacheConfig.provider,
      this.logService,
      supabase
    );

    // Inicializar repositórios
    const usuarioRepository = new UsuarioRepository(this.logService);

    // Inicializar sistema avançado de autenticação
    this.enhancedAuthService = new EnhancedAuthService(supabase as ReturnType<typeof createClient>, {
      jwtSecret: process.env.JWT_SECRET!,
      accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '2592000', 10), // 25 minutos
      refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '7776000', 10) // 7 dias
    });

    // Inicializar middleware avançado de autenticação
    this.enhancedAuthMiddleware = createEnhancedAuthMiddleware(supabase as ReturnType<typeof createClient>, process.env.JWT_SECRET!);
    
    // Criar adapter para compatibilidade
    this.authService = new AuthServiceAdapter(this.enhancedAuthService);
    
    this.usuarioService = new UsuarioService(
      usuarioRepository,
      this.authService
    );
    this.guruAprovacaoService = new GuruAprovacaoService(
      usuarioRepository,
      this.logService,
      this.cacheManager.getCacheService(),
      supabase
    );
    this.adminService = new AdminService(
      this.logService,
      this.cacheManager.getCacheService(),
      usuarioRepository,
      supabase
    );

    this.logService.info('Serviços inicializados com sucesso');
  }

  private initializeMiddlewares(): void {
    // Apply all security middlewares (includes helmet and CSP)
    applySecurityMiddlewares(this.app as import('express').Express, {
      csp: {
        reportOnly: process.env.NODE_ENV !== 'production',
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", "data:", "blob:", "https:"],
          'font-src': ["'self'"],
          'connect-src': ["'self'"],
          'frame-src': ["'self'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'self'"],
          'upgrade-insecure-requests': []
        }
      }
    });

    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
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
        codigo: 'RATE_LIMIT_EXCEEDED'
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
        }
      }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Debug middleware
    this.app.use(debugRequestMiddleware);

    // Middleware JWT global (define req.user se token válido for encontrado)
    this.app.use('/api', jwtAuthGlobal);

    // Middleware de autenticação
    this.app.use('/api/protected', this.authMiddleware.bind(this));
    this.app.use('/api/admin', this.enhancedAuthMiddleware.requireAdmin());
  }

  private initializeRoutes(): void {
    // Rota de health check
    this.app.get('/api/health', async (req, res) => {
      try {
        const conexaoBanco = await SupabaseConfig.testarConexao();
        const estatisticasCache = await this.cacheManager.getStats();

        res.json({
          success: true,
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memoria: process.memoryUsage(),
            conexao_banco: conexaoBanco,
            cache: estatisticasCache,
            cache_provider: cacheConfig.provider
          },
          message: 'Sistema funcionando normalmente'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Erro no health check',
          details: (error as Error).message
        });
      }
    });

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
          userAgent
        });

        if (resultado.success) {
          // Definir cookies seguros
          res.cookie('accessToken', resultado.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 2592000000 // 30 dias
          });

          res.cookie('refreshToken', resultado.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: rememberMe ? 2592000000 : 604800000 // 30 dias ou 7 dias
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
            error: { message: 'Token de autenticação necessário', code: 'TOKEN_REQUIRED' }
          });
        }
        
        const validation = await this.enhancedAuthService.validateAccessToken(token);
        if (!validation.valid) {
          return res.status(401).json({
            success: false,
            error: { message: validation.error || 'Token inválido', code: 'INVALID_TOKEN' }
          });
        }

        res.json({
          success: true,
          data: validation.user,
          message: 'Dados do usuário obtidos com sucesso'
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
            error: { message: 'Refresh token necessário', code: 'MISSING_REFRESH_TOKEN' }
          });
        }

        const resultado = await this.enhancedAuthService.refreshToken(refreshToken, ipAddress, userAgent);
        
        if (resultado.success && resultado.accessToken) {
          res.cookie('accessToken', resultado.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hora
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
        const userId = req.body.userId;

        if (token && userId) {
          await this.enhancedAuthService.logout(token, userId);
        }

        // Limpar cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.json({
          success: true,
          message: 'Logout realizado com sucesso'
        });
      } catch (error) {
        next(error);
      }
    });

    // Rota para logout de todas as sessões
    this.app.post('/api/auth/logout-all', this.enhancedAuthMiddleware.requireActiveUser(), async (req, res, next) => {
      try {
        await this.enhancedAuthService.logoutAllSessions((req as AuthenticatedRequest).user!.id);

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.json({
          success: true,
          message: 'Logout de todas as sessões realizado'
        });
      } catch (error) {
        next(error);
      }
    });

    // Rota para listar sessões ativas
    this.app.get('/api/auth/sessions', this.enhancedAuthMiddleware.requireActiveUser(), async (req, res, next) => {
      try {
        const sessions = await this.enhancedAuthService.getUserSessions((req as AuthenticatedRequest).user!.id);
        res.json({
          success: true,
          data: sessions
        });
      } catch (error) {
        next(error);
      }
    });

    // Rota para revogar sessão específica
    this.app.delete('/api/auth/sessions/:sessionId', this.enhancedAuthMiddleware.requireActiveUser(), async (req, res, next) => {
      try {
        const result = await this.enhancedAuthService.revokeSession((req as AuthenticatedRequest).user!.id, req.params.sessionId);
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
          tempo_prova
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
          message: 'Métricas atualizadas com sucesso'
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
            codigo: 'ERRO_LIST_USERS'
          });
        }

        res.json({
          success: true,
          message: 'Conexão com Supabase funcionando',
          usersCount: users.users.length,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurada' : 'Não configurada'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Erro ao testar conexão',
          details: error instanceof Error ? error.message : 'Erro desconhecido',
          codigo: 'ERRO_CONNECTION'
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
            codigo: 'EMAIL_OBRIGATORIO'
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
          message: 'Usuário removido com sucesso'
        });
      } catch (error) {
        this.logService.erro('Erro ao remover usuário', error as Error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor',
          codigo: 'ERRO_INTERNO'
        });
      }
    });

    // Endpoint especial para criar o primeiro admin (sem autenticação)
    // REMOVIDO POR SOLICITAÇÃO

    // Registrar rotas da pasta api
    this.app.use('/api/apostilas', apostilasRoutes);
    this.app.use('/api/simulados', simuladosRoutes);
    this.app.use('/api/flashcards', flashcardsRoutes);
    this.app.use('/api/questoes-semanais', questoesSemanaisRoutes);
    this.app.use('/api/plano-estudos', planoEstudosRoutes);
    this.app.use('/api/mapa-assuntos', mapaAssuntosRoutes);
    this.app.use('/api/concurso-categorias', concursoCategoriasRoutes);
    this.app.use('/api/categoria-disciplinas', categoriaDisciplinasRoutes);
    this.app.use('/api/estatisticas', estatisticasRoutes);
    this.app.use('/api/user', userRoutes);
    this.app.use('/api/user/concurso-preference', userConcursoPreferenceRoutes);
    this.app.use('/api/user/auth-test', userAuthTestRoutes);
    this.app.use('/api/auth/token-debug', tokenDebugRoutes);
    this.app.use('/api/dashboard/enhanced-stats', dashboardEnhancedStatsRoutes);
    this.app.use('/api/dashboard/activities', dashboardActivitiesRoutes);
    this.app.use('/api/dashboard/stats', dashboardStatsRoutes);
    this.app.use('/api/conteudo/filtrado', conteudoFiltradoRoutes);
    this.app.use('/api/auth/verify-token', verifyTokenRoutes);
    this.app.use('/api/debug', debugRoutes);
    this.app.use('/api/test', testRoutes);
    this.app.use('/api/simple', simpleRoutes);
    this.app.use('/api/concursos', concursosRoutes);

    // Rota 404
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Rota não encontrada',
        codigo: 'ROTA_NAO_ENCONTRADA'
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      this.logService.erro('Erro na aplicação', error, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor',
        codigo: 'ERRO_INTERNO'
      });
    });
  }

  private async authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization;
      
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Token de acesso necessário',
          codigo: 'TOKEN_NECESSARIO'
        });
        return;
      }

      const validation = await this.enhancedAuthService.validateAccessToken(token);
      
      if (!validation.valid) {
        res.status(401).json({
          success: false,
          error: validation.error || 'Token inválido ou expirado',
          codigo: 'TOKEN_INVALIDO'
        });
        return;
      }
      
      const usuario = {
        id: validation.user.id,
        nome: validation.user.nome ?? '',
        email: validation.user.email,
        senha_hash: '',
        ativo: validation.user.ativo ?? true,
        primeiro_login: validation.user.primeiro_login ?? false,
        total_questoes_respondidas: 0,
        total_acertos: 0,
        tempo_estudo_minutos: 0,
        pontuacao_media: 0,
        criado_em: new Date(),
        atualizado_em: new Date(),
        role: validation.user.role
      };
      (req as RequestComUsuario).usuario = usuario;
      next();
    } catch (error) {
      this.logService.erro('Erro no middleware de autenticação', error as Error);
      res.status(500).json({
        success: false,
        error: 'Erro interno de autenticação',
        codigo: 'ERRO_AUTH_MIDDLEWARE'
      });
    }
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
      // Testar conexões antes de iniciar
      const conexaoBanco = await SupabaseConfig.testarConexao();
      if (!conexaoBanco) {
        throw new Error('Falha na conexão com o banco de dados');
      }

      this.app.listen(port, '0.0.0.0', () => {
        this.logService.info(`Servidor AprovaFácil iniciado na porta ${port}`, {
          port,
          ambiente: process.env.NODE_ENV || 'development',
          versao_node: process.version
        });
      });
    } catch (error) {
      this.logService.erro('Erro ao iniciar servidor', error as Error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

export default AprovaFacilApp;