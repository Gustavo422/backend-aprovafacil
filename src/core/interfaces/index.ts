// Interfaces principais do sistema AprovaFácil
// Seguindo os princípios SOLID

import { 
  Usuario, 
  Concurso, 
  Simulado, 
  QuestaoSimulado,
  QuestoesSemanas,
  CartaoMemorizacao,
  Apostila,
  ConteudoApostila,
  PlanoEstudo,
  ApiResponse,
  PaginatedResponse,
  FiltroBase,
  MetricasGuruAprovacao,
  EstatisticasUsuario,
  RelatorioDesempenho,
} from '../../shared/types/index.js';

// Interface base para repositórios (Repository Pattern)
export interface IBaseRepository<T, TFilter extends FiltroBase = FiltroBase> {
  buscarPorId(id: string): Promise<T | null>;
  buscarTodos(filtro?: TFilter): Promise<PaginatedResponse<T>>;
  criar(dados: Partial<T>): Promise<T>;
  atualizar(id: string, dados: Partial<T>): Promise<T>;
  excluir(id: string): Promise<boolean>;
  existePorId(id: string): Promise<boolean>;
}

// Interface para serviços (Service Layer Pattern)
export interface IBaseService<T, TFilter extends FiltroBase = FiltroBase> {
  buscarPorId(id: string): Promise<ApiResponse<T>>;
  buscarTodos(filtro?: TFilter): Promise<PaginatedResponse<T>>;
  criar(dados: Partial<T>): Promise<ApiResponse<T>>;
  atualizar(id: string, dados: Partial<T>): Promise<ApiResponse<T>>;
  excluir(id: string): Promise<ApiResponse<boolean>>;
}

// Interface para validadores (Strategy Pattern)
export interface IValidator<T> {
  validar(dados: T): Promise<{ valido: boolean; erros: string[] }>;
}

// Interface para cache (Strategy Pattern)
export interface ICacheService {
  obter<T>(chave: string): Promise<T | null>;
  definir<T>(chave: string, valor: T, ttlSegundos?: number): Promise<void>;
  remover(chave: string): Promise<void>;
  limpar(padrao?: string): Promise<void>;
  limparPorPrefixo(prefixo: string): Promise<void>;
  existe(chave: string): Promise<boolean>;
  obterEstatisticas(): Promise<unknown>;
  limparCacheExpiradoBanco(): Promise<number>;
}

// Interface para logs (Observer Pattern)
export interface ILogService {
  info(mensagem: string, detalhes?: unknown): Promise<void>;
  erro(mensagem: string, erro?: Error, detalhes?: unknown): Promise<void>;
  aviso(mensagem: string, detalhes?: unknown): Promise<void>;
  debug(mensagem: string, detalhes?: unknown): Promise<void>;
  auditoria(acao: string, tabela: string, dadosAntigos?: unknown, dadosNovos?: unknown, usuarioId?: string): Promise<void>;
  logarOperacaoCache(operacao: string, chave: string, sucesso: boolean): Promise<void>;
  logarInicioOperacao(operacao: string, detalhes?: unknown): Promise<void>;
  logarFimOperacao(operacao: string, sucesso: boolean): Promise<void>;
  logarCriacaoConteudo(tipo: string, id: string | number): Promise<void>;
  logarExclusaoConteudo(tipo: string, id: string | number, usuarioId?: string): Promise<void>;
  obterLogs(filtro?: unknown): Promise<{ logs: unknown[]; total: number }>;
  obterEstatisticasLogs(): Promise<unknown>;
  logarTentativaLogin(email: string, sucesso: boolean): Promise<void>;
  logarAlteracaoSenha(usuarioId: string): Promise<void>;
  logarAcessoUsuario(usuarioId: string, acao: string): Promise<void>;
}

// Interface para autenticação (Strategy Pattern)
export interface IAuthService {
  login(email: string, senha: string): Promise<ApiResponse<{ usuario: Usuario; token: string }>>;
  validarToken(token: string): Promise<Usuario | null>;
  criarHash(senha: string): Promise<string>;
  verificarSenha(senha: string, hash: string): Promise<boolean>;
  gerarToken(usuario: Usuario): Promise<string>;
}

// Interface para usuários
export interface IUsuarioRepository extends IBaseRepository<Usuario> {
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorAuthUserId(authUserId: string): Promise<Usuario | null>;
  atualizarPorAuthUserId(authUserId: string, dados: Partial<Usuario>): Promise<Usuario>;
  excluirPorAuthUserId(authUserId: string): Promise<boolean>;
  atualizarUltimoLogin(id: string): Promise<void>;
  atualizarUltimoLoginPorAuthUserId(authUserId: string): Promise<void>;
  atualizarEstatisticas(id: string, estatisticas: Partial<EstatisticasUsuario>): Promise<void>;
  atualizarEstatisticasPorAuthUserId(authUserId: string, estatisticas: Partial<EstatisticasUsuario>): Promise<void>;
  buscarUsuariosAtivos(): Promise<Usuario[]>;
  obterUsuariosComPrimeiroLogin(): Promise<Usuario[]>;
  obterEstatisticasUsuario(id: string): Promise<EstatisticasUsuario>;
  marcarPrimeiroLoginCompleto(id: string): Promise<void>;
}

export interface IUsuarioService extends IBaseService<Usuario> {
  buscarPorEmail(email: string): Promise<ApiResponse<Usuario>>;
  criarUsuario(dados: { nome: string; email: string; senha: string }): Promise<ApiResponse<Usuario>>;
  atualizarPerfil(id: string, dados: Partial<Usuario>): Promise<ApiResponse<Usuario>>;
  obterEstatisticas(id: string): Promise<ApiResponse<EstatisticasUsuario>>;
  configuracaoInicial(usuarioId: string, concursoId: string, horasEstudo: number, tempoProva: number): Promise<ApiResponse<boolean>>;
}

// Interface para concursos
export interface IConcursoRepository extends IBaseRepository<Concurso> {
  buscarPorSlug(slug: string): Promise<Concurso | null>;
  buscarPorCategoria(categoriaId: string): Promise<Concurso[]>;
  buscarAtivos(): Promise<Concurso[]>;
}

export interface IConcursoService extends IBaseService<Concurso> {
  buscarPorSlug(slug: string): Promise<ApiResponse<Concurso>>;
  buscarPorCategoria(categoriaId: string): Promise<ApiResponse<Concurso[]>>;
  buscarAtivos(): Promise<ApiResponse<Concurso[]>>;
}

// Interface para simulados
export interface ISimuladoRepository extends IBaseRepository<Simulado> {
  buscarPorSlug(slug: string): Promise<Simulado | null>;
  buscarPorConcurso(concursoId: string): Promise<Simulado[]>;
  buscarPublicos(): Promise<Simulado[]>;
  buscarComQuestoes(id: string): Promise<Simulado & { questoes: QuestaoSimulado[] }>;
}

export interface ISimuladoService extends IBaseService<Simulado> {
  buscarPorSlug(slug: string): Promise<ApiResponse<Simulado>>;
  buscarPorConcurso(concursoId: string): Promise<ApiResponse<Simulado[]>>;
  buscarPublicos(): Promise<ApiResponse<Simulado[]>>;
  buscarComQuestoes(id: string): Promise<ApiResponse<Simulado & { questoes: QuestaoSimulado[] }>>;
  criarComQuestoes(simulado: Partial<Simulado>, questoes: Partial<QuestaoSimulado>[]): Promise<ApiResponse<Simulado>>;
}

// Interface para questões semanais
export interface IQuestoesSemanaRepository extends IBaseRepository<QuestoesSemanas> {
  buscarPorSemana(ano: number, semana: number): Promise<QuestoesSemanas | null>;
  buscarAtivas(): Promise<QuestoesSemanas[]>;
  buscarPorConcurso(concursoId: string): Promise<QuestoesSemanas[]>;
}

export interface IQuestoesSemanaService extends IBaseService<QuestoesSemanas> {
  buscarPorSemana(ano: number, semana: number): Promise<ApiResponse<QuestoesSemanas>>;
  buscarAtivas(): Promise<ApiResponse<QuestoesSemanas[]>>;
  buscarPorConcurso(concursoId: string): Promise<ApiResponse<QuestoesSemanas[]>>;
  responderQuestao(usuarioId: string, questaoId: string, resposta: string): Promise<ApiResponse<boolean>>;
}

// Interface para flashcards
export interface IFlashcardRepository extends IBaseRepository<CartaoMemorizacao> {
  buscarPorDisciplina(disciplina: string): Promise<CartaoMemorizacao[]>;
  buscarPorConcurso(concursoId: string): Promise<CartaoMemorizacao[]>;
  buscarParaRevisao(usuarioId: string): Promise<CartaoMemorizacao[]>;
}

export interface IFlashcardService extends IBaseService<CartaoMemorizacao> {
  buscarPorDisciplina(disciplina: string): Promise<ApiResponse<CartaoMemorizacao[]>>;
  buscarPorConcurso(concursoId: string): Promise<ApiResponse<CartaoMemorizacao[]>>;
  buscarParaRevisao(usuarioId: string): Promise<ApiResponse<CartaoMemorizacao[]>>;
  responderFlashcard(usuarioId: string, flashcardId: string, acertou: boolean): Promise<ApiResponse<boolean>>;
}

// Interface para apostilas
export interface IApostilaRepository extends IBaseRepository<Apostila> {
  buscarPorSlug(slug: string): Promise<Apostila | null>;
  buscarPorConcurso(concursoId: string): Promise<Apostila[]>;
  buscarComConteudo(id: string): Promise<Apostila & { conteudo: ConteudoApostila[] }>;
}

export interface IApostilaService extends IBaseService<Apostila> {
  buscarPorSlug(slug: string): Promise<ApiResponse<Apostila>>;
  buscarPorConcurso(concursoId: string): Promise<ApiResponse<Apostila[]>>;
  buscarComConteudo(id: string): Promise<ApiResponse<Apostila & { conteudo: ConteudoApostila[] }>>;
  marcarProgresso(usuarioId: string, conteudoId: string, percentual: number): Promise<ApiResponse<boolean>>;
}

// Interface para planos de estudo
export interface IPlanoEstudoRepository extends IBaseRepository<PlanoEstudo> {
  buscarPorUsuario(usuarioId: string): Promise<PlanoEstudo[]>;
  buscarAtivoPorUsuario(usuarioId: string): Promise<PlanoEstudo | null>;
}

export interface IPlanoEstudoService extends IBaseService<PlanoEstudo> {
  buscarPorUsuario(usuarioId: string): Promise<ApiResponse<PlanoEstudo[]>>;
  buscarAtivoPorUsuario(usuarioId: string): Promise<ApiResponse<PlanoEstudo>>;
  gerarPlanoInteligente(usuarioId: string, concursoId: string, horasEstudo: number, tempoProva: number): Promise<ApiResponse<PlanoEstudo>>;
  atualizarProgresso(usuarioId: string, itemId: string, concluido: boolean): Promise<ApiResponse<boolean>>;
}

// Interface para o Guru da Aprovação
export interface IGuruAprovacaoService {
  calcularMetricas(usuarioId: string): Promise<ApiResponse<MetricasGuruAprovacao>>;
  obterPrognostico(usuarioId: string): Promise<ApiResponse<{
    distancia_aprovacao: number;
    tempo_estimado: string;
    recomendacoes: string[];
  }>>;
  atualizarMetricas(usuarioId: string): Promise<void>;
}

// Interface para relatórios
export interface IRelatorioService {
  gerarRelatorioDesempenho(usuarioId: string, dataInicio: Date, dataFim: Date): Promise<ApiResponse<RelatorioDesempenho>>;
  gerarRelatorioProgresso(usuarioId: string): Promise<ApiResponse<unknown>>;
  exportarDados(usuarioId: string, formato: 'pdf' | 'excel'): Promise<ApiResponse<Buffer>>;
}

// Interface para administração
export interface IAdminService {
  obterEstatisticasSistema(): Promise<ApiResponse<unknown>>;
  gerenciarUsuarios(): Promise<ApiResponse<unknown>>;
  gerenciarConteudo(): Promise<ApiResponse<unknown>>;
  executarTestes(): Promise<ApiResponse<unknown>>;
  limparCache(): Promise<ApiResponse<boolean>>;
  obterLogs(filtro?: unknown): Promise<ApiResponse<unknown>>;
  obterMetricas(): Promise<ApiResponse<unknown>>;
}

// Interface para notificações (Observer Pattern)
export interface INotificacaoService {
  enviarEmail(destinatario: string, assunto: string, conteudo: string): Promise<boolean>;
  enviarNotificacaoSistema(usuarioId: string, mensagem: string): Promise<boolean>;
  programarLembrete(usuarioId: string, tipo: string, data: Date): Promise<boolean>;
}

// Interface para backup e migração
export interface IBackupService {
  criarBackup(): Promise<ApiResponse<string>>;
  restaurarBackup(arquivo: string): Promise<ApiResponse<boolean>>;
  migrarDados(versaoOrigem: string, versaoDestino: string): Promise<ApiResponse<boolean>>;
}

// Interface para configurações do sistema
export interface IConfiguracaoService {
  obterConfiguracao(chave: string): Promise<unknown>;
  definirConfiguracao(chave: string, valor: unknown): Promise<boolean>;
  obterTodasConfiguracoes(): Promise<Record<string, unknown>>;
  resetarConfiguracoes(): Promise<boolean>;
}

// Interface para monitoramento de saúde do sistema
export interface IHealthService {
  verificarSaude(): Promise<{
    status: 'healthy' | 'unhealthy';
    servicos: Record<string, boolean>;
    tempo_resposta: number;
    memoria_uso: number;
    cpu_uso: number;
  }>;
  verificarConexaoBanco(): Promise<boolean>;
  verificarCache(): Promise<boolean>;
  obterMetricasPerformance(): Promise<unknown>;
}

// Interface para middleware de autenticação
export interface IAuthMiddleware {
  verificarToken(req: unknown, res: unknown, next: unknown): Promise<void>;
  verificarPermissao(permissao: string): (req: unknown, res: unknown, next: unknown) => Promise<void>;
  verificarAdmin(req: unknown, res: unknown, next: unknown): Promise<void>;
}

// Interface para middleware de rate limiting
export interface IRateLimitMiddleware {
  aplicarLimite(limite: number, janela: number): (req: unknown, res: unknown, next: unknown) => void;
  verificarLimite(chave: string): Promise<boolean>;
}

// Interface para validação de dados
export interface IValidationMiddleware {
  validarCorpo(schema: unknown): (req: unknown, res: unknown, next: unknown) => void;
  validarParametros(schema: unknown): (req: unknown, res: unknown, next: unknown) => void;
  validarQuery(schema: unknown): (req: unknown, res: unknown, next: unknown) => void;
}

// Interface para tratamento de erros
export interface IErrorHandler {
  tratarErro(erro: Error, req: unknown, res: unknown, next: unknown): void;
  criarErroPersonalizado(codigo: number, mensagem: string, detalhes?: unknown): Error;
  logarErro(erro: Error, contexto?: unknown): Promise<void>;
}

