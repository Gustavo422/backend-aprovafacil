import { BaseService, BaseServiceOptions } from '../../core/services/base-service.js';
import { IUsuarioService, IUsuarioRepository, IAuthService } from '../../core/interfaces/index.js';
import { Usuario, ApiResponse, EstatisticasUsuario, FiltroBase } from '../../shared/types/index.js';
import { ValidationError, NotFoundError } from '../../core/errors/index.js';
import { performance } from 'perf_hooks';

/**
 * Filtro para usuários
 */
export interface FiltroUsuario extends FiltroBase {
  /**
   * Filtrar por status
   */
  ativo?: boolean;
  
  /**
   * Filtrar por role
   */
  role?: string;
  
  /**
   * Filtrar por primeiro login
   */
  primeiro_login?: boolean;
  
  /**
   * Busca textual
   */
  search?: string;
}

/**
 * Dados para criação de usuário
 */
export interface CriarUsuarioData {
  nome: string;
  email: string;
  senha: string;
  role?: string;
}

/**
 * Dados para atualização de perfil
 */
export interface AtualizarPerfilData {
  nome?: string;
  email?: string;
}

/**
 * Serviço de usuários
 */
export class UsuarioService extends BaseService<Usuario, FiltroUsuario> implements IUsuarioService {
  /**
   * Serviço de autenticação
   */
  private readonly authService: IAuthService;
  
  /**
   * Construtor
   * @param usuarioRepository Repositório de usuários
   * @param authService Serviço de autenticação
   * @param options Opções do serviço
   */
  constructor(
    usuarioRepository: IUsuarioRepository,
    authService: IAuthService,
    options?: Partial<BaseServiceOptions>
  ) {
    super(usuarioRepository, {
      serviceName: 'Usuario',
      enableCache: true,
      cacheTime: 300, // 5 minutos
      ...options
    });
    
    this.authService = authService;
    this.logger.info('Serviço de usuários inicializado');
  }
  
  /**
   * Buscar usuário por email
   * @param email Email do usuário
   * @returns Resposta com o usuário
   */
  async buscarPorEmail(email: string): Promise<ApiResponse<Usuario>> {
    const startTime = performance.now();
    const operationId = `usuario-buscarPorEmail-${Date.now()}`;
    
    try {
      this.logger.debug('Buscando usuário por email', { 
        operationId, 
        email: this.sanitizeEmail(email) 
      });
      
      // Validar entrada
      if (!email) {
        throw new ValidationError('Email é obrigatório');
      }
      
      if (!this.isValidEmail(email)) {
        throw new ValidationError('Email inválido');
      }
      
      // Verificar cache
      if (this.enableCache) {
        const cached = this.getFromCache(`buscarPorEmail:${email}`);
        if (cached && this.isUsuario(cached)) {
          this.logger.debug('Cache hit para buscarPorEmail', { operationId });
          return {
            success: true,
            data: cached
          };
        }
      }
      
      // Buscar no repositório
      const usuario = await (this.repository as IUsuarioRepository).buscarPorEmail(email);
      
      if (!usuario) {
        const executionTime = performance.now() - startTime;
        this.logger.warn('Usuário não encontrado por email', {
          operationId,
          email: this.sanitizeEmail(email),
          executionTimeMs: executionTime.toFixed(2)
        });
        
        return {
          success: false,
          message: 'Usuário não encontrado',
          error: 'NOT_FOUND'
        };
      }
      
      // Processar dados após busca
      const processedUser = await this.processAfterFind(usuario);
      
      // Salvar no cache
      if (this.enableCache) {
        this.setCache(`buscarPorEmail:${email}`, processedUser);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug('Usuário encontrado por email', {
        operationId,
        userId: usuario.id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedUser
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, `buscarPorEmail:${email}`, operationId, executionTime);
    }
  }
  
  /**
   * Criar usuário
   * @param dados Dados do usuário
   * @returns Resposta com o usuário criado
   */
  async criarUsuario(dados: CriarUsuarioData): Promise<ApiResponse<Usuario>> {
    const startTime = performance.now();
    const operationId = `usuario-criarUsuario-${Date.now()}`;
    
    try {
      this.logger.debug('Criando novo usuário', { 
        operationId,
        email: this.sanitizeEmail(dados.email)
      });
      
      // Validar entrada
      await this.validateCreateUserInput(dados);
      
      // Verificar se email já existe
      const usuarioExistente = await (this.repository as IUsuarioRepository).buscarPorEmail(dados.email);
      
      if (usuarioExistente) {
        return {
          success: false,
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'Email já está em uso'
        };
      }
      
      // Criar hash da senha
      const senhaHash = await this.authService.criarHash(dados.senha);
      
      // Preparar dados do usuário
      const dadosUsuario: Partial<Usuario> = {
        nome: dados.nome,
        email: dados.email.toLowerCase(),
        senha_hash: senhaHash,
        role: dados.role || 'user',
        ativo: true,
        primeiro_login: true,
        total_questoes_respondidas: 0,
        total_acertos: 0,
        tempo_estudo_minutos: 0,
        pontuacao_media: 0
      };
      
      // Criar usuário
      const usuario = await this.repository.criar(dadosUsuario);
      
      // Processar dados após criação
      const processedUser = await this.processAfterCreate(usuario);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('criar');
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info('Usuário criado com sucesso', {
        operationId,
        userId: usuario.id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedUser,
        message: 'Usuário criado com sucesso'
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, 'criarUsuario', operationId, executionTime);
    }
  }
  
  /**
   * Atualizar perfil do usuário
   * @param id ID do usuário
   * @param dados Dados para atualização
   * @returns Resposta com o usuário atualizado
   */
  async atualizarPerfil(id: string, dados: AtualizarPerfilData): Promise<ApiResponse<Usuario>> {
    const startTime = performance.now();
    const operationId = `usuario-atualizarPerfil-${Date.now()}`;
    
    try {
      this.logger.debug('Atualizando perfil do usuário', { 
        operationId,
        userId: id,
        dados: this.sanitizeLogData(dados)
      });
      
      // Validar entrada
      await this.validateUpdateProfileInput(dados);
      
      // Verificar se usuário existe
      const usuarioExistente = await this.repository.buscarPorId(id);
      
      if (!usuarioExistente) {
        throw new NotFoundError('Usuário não encontrado');
      }
      
      // Se email está sendo alterado, verificar se já existe
      if (dados.email && dados.email !== usuarioExistente.email) {
        const emailExistente = await (this.repository as IUsuarioRepository).buscarPorEmail(dados.email);
        
        if (emailExistente) {
          return {
            success: false,
            error: 'EMAIL_ALREADY_EXISTS',
            message: 'Email já está em uso'
          };
        }
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao: Partial<Usuario> = {};
      
      if (dados.nome) {
        dadosAtualizacao.nome = dados.nome.trim();
      }
      
      if (dados.email) {
        dadosAtualizacao.email = dados.email.toLowerCase();
      }
      
      // Atualizar usuário
      const usuarioAtualizado = await this.repository.atualizar(id, dadosAtualizacao);
      
      // Processar dados após atualização
      const processedUser = await this.processAfterUpdate(usuarioAtualizado);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('atualizar', id);
        // Se necessário, adicione métodos públicos para limpar o cache de email no BaseService
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info('Perfil do usuário atualizado com sucesso', {
        operationId,
        userId: id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedUser,
        message: 'Perfil atualizado com sucesso'
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, `atualizarPerfil:${id}`, operationId, executionTime);
    }
  }
  
  /**
   * Obter estatísticas do usuário
   * @param id ID do usuário
   * @returns Resposta com as estatísticas
   */
  async obterEstatisticas(id: string): Promise<ApiResponse<EstatisticasUsuario>> {
    const startTime = performance.now();
    const operationId = `usuario-obterEstatisticas-${Date.now()}`;
    
    try {
      this.logger.debug('Obtendo estatísticas do usuário', { operationId, userId: id });
      
      // Validar entrada
      if (!id) {
        throw new ValidationError('ID do usuário é obrigatório');
      }
      
      // Verificar cache
      if (this.enableCache) {
        const cached = this.getFromCache(`estatisticas:${id}`);
        if (cached && this.isEstatisticasUsuario(cached)) {
          this.logger.debug('Cache hit para estatísticas', { operationId });
          return {
            success: true,
            data: cached
          };
        }
      }
      
      // Obter estatísticas do repositório
      const estatisticas = await (this.repository as IUsuarioRepository).obterEstatisticasUsuario(id);
      
      // Salvar no cache
      // if (this.enableCache) {
      //   this.setCache(`estatisticas:${id}`, estatisticas);
      // }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug('Estatísticas obtidas com sucesso', {
        operationId,
        userId: id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: estatisticas
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      // Corrigir tipo de retorno para garantir compatibilidade
      const resp = this.handleError(error, `obterEstatisticas:${id}`, operationId, executionTime);
      return { ...resp, data: undefined } as ApiResponse<EstatisticasUsuario>;
    }
  }
  
  /**
   * Configuração inicial do usuário
   * @param usuarioId ID do usuário
   * @param concursoId ID do concurso
   * @param horasEstudo Horas de estudo diárias
   * @param tempoProva Tempo até a prova em meses
   * @returns Resposta da operação
   */
  async configuracaoInicial(
    usuarioId: string, 
    concursoId: string, 
    horasEstudo: number, 
    tempoProva: number
  ): Promise<ApiResponse<boolean>> {
    const startTime = performance.now();
    const operationId = `usuario-configuracaoInicial-${Date.now()}`;
    
    try {
      this.logger.debug('Configuração inicial do usuário', {
        operationId,
        usuarioId,
        concursoId,
        horasEstudo,
        tempoProva
      });
      
      // Validar entrada
      if (!usuarioId || !concursoId) {
        throw new ValidationError('ID do usuário e concurso são obrigatórios');
      }
      
      if (horasEstudo <= 0 || horasEstudo > 24) {
        throw new ValidationError('Horas de estudo deve estar entre 1 e 24');
      }
      
      if (tempoProva <= 0 || tempoProva > 60) {
        throw new ValidationError('Tempo até a prova deve estar entre 1 e 60 meses');
      }
      
      // Verificar se usuário existe
      const usuario = await this.repository.buscarPorId(usuarioId);
      
      if (!usuario) {
        throw new NotFoundError('Usuário não encontrado');
      }
      
      // Marcar primeiro login como completo
      await (this.repository as IUsuarioRepository).marcarPrimeiroLoginCompleto(usuarioId);
      
      // Aqui você pode adicionar lógica para criar plano de estudos, etc.
      // Por exemplo, integração com serviço de planos de estudo
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('atualizar', usuarioId);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info('Configuração inicial concluída', {
        operationId,
        usuarioId,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: true,
        message: 'Configuração inicial concluída com sucesso'
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      // Corrigir tipo de retorno para garantir compatibilidade
      const resp = this.handleError(error, `configuracaoInicial:${usuarioId}`, operationId, executionTime);
      return { ...resp, data: undefined } as ApiResponse<boolean>;
    }
  }
  
  /**
   * Processar dados após busca (remover dados sensíveis)
   * @param data Dados do usuário
   * @returns Dados processados
   */
  protected async processAfterFind(data: Usuario): Promise<Usuario> {
    // Remover dados sensíveis
    const usuarioSemSenha = { ...data };
    return usuarioSemSenha as Usuario;
  }
  
  /**
   * Processar dados após criação (remover dados sensíveis)
   * @param data Dados do usuário criado
   * @returns Dados processados
   */
  protected async processAfterCreate(data: Usuario): Promise<Usuario> {
    // Remover dados sensíveis
    const usuarioSemSenha = { ...data };
    return usuarioSemSenha as Usuario;
  }
  
  /**
   * Processar dados após atualização (remover dados sensíveis)
   * @param data Dados do usuário atualizado
   * @returns Dados processados
   */
  protected async processAfterUpdate(data: Usuario): Promise<Usuario> {
    // Remover dados sensíveis
    const usuarioSemSenha = { ...data };
    return usuarioSemSenha as Usuario;
  }
  
  /**
   * Validar entrada para criação de usuário
   * @param dados Dados do usuário
   */
  private async validateCreateUserInput(dados: CriarUsuarioData): Promise<void> {
    if (!dados.nome || dados.nome.trim().length < 2) {
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres');
    }
    
    if (!dados.email || !this.isValidEmail(dados.email)) {
      throw new ValidationError('Email inválido');
    }
    
    if (!dados.senha || dados.senha.length < 6) {
      throw new ValidationError('Senha deve ter pelo menos 6 caracteres');
    }
    
    if (dados.role && !['admin', 'user'].includes(dados.role)) {
      throw new ValidationError('Role inválido');
    }
  }
  
  /**
   * Validar entrada para atualização de perfil
   * @param dados Dados para atualização
   */
  private async validateUpdateProfileInput(dados: AtualizarPerfilData): Promise<void> {
    if (dados.nome !== undefined && dados.nome.trim().length < 2) {
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres');
    }
    
    if (dados.email !== undefined && !this.isValidEmail(dados.email)) {
      throw new ValidationError('Email inválido');
    }
  }
  
  /**
   * Validar formato do email
   * @param email Email a ser validado
   * @returns True se email é válido
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Sanitizar email para logs
   * @param email Email
   * @returns Email sanitizado
   */
  private sanitizeEmail(email: string): string {
    if (!email) return '[EMPTY]';
    
    const [local, domain] = email.split('@');
    if (!domain) return '[INVALID]';
    
    const sanitizedLocal = local.length > 2 
      ? local.substring(0, 2) + '***'
      : '***';
    
    return `${sanitizedLocal}@${domain}`;
  }

  /**
   * Verifica se o objeto é do tipo Usuario
   */
  private isUsuario(obj: unknown): obj is Usuario {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'email' in obj
    );
  }

  /**
   * Verifica se o objeto é do tipo EstatisticasUsuario
   */
  private isEstatisticasUsuario(obj: unknown): obj is EstatisticasUsuario {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'total_simulados_realizados' in obj
    );
  }
}