// Tipos compartilhados do sistema AprovaFácil

export interface Usuario {
  id: string;
  auth_usuario_id?: string;
  nome: string;
  email: string;
  senha_hash: string; // Adicionado para autenticação
  ativo: boolean;
  primeiro_login: boolean;
  ultimo_login?: Date;
  total_questoes_respondidas: number;
  total_acertos: number;
  tempo_estudo_minutos: number;
  pontuacao_media: number;
  criado_em: Date;
  atualizado_em: Date;
  role: string; // 'admin' ou 'user'
}

export interface CategoriasConcursos {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  cor_primaria: string;
  cor_secundaria: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Concurso {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  ano?: number;
  banca?: string;
  categoria_id?: string;
  url_edital?: string;
  data_prova?: Date;
  vagas?: number;
  salario?: number;
  nivel_dificuldade: 'facil' | 'medio' | 'dificil';
  multiplicador_questoes: number;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Simulado {
  id: string;
  titulo: string;
  slug: string;
  descricao?: string;
  concurso_id?: string;
  categoria_id?: string;
  numero_questoes: number;
  tempo_minutos: number;
  dificuldade: 'facil' | 'medio' | 'dificil';
  disciplinas?: string[];
  publico: boolean;
  ativo: boolean;
  criado_por?: string;
  criado_em: Date;
  atualizado_em: Date;
}

export interface QuestaoSimulado {
  id: string;
  simulado_id: string;
  numero_questao: number;
  enunciado: string;
  alternativas: Record<string, string>;
  resposta_correta: string;
  explicacao?: string;
  disciplina?: string;
  assunto?: string;
  dificuldade: string;
  peso_disciplina?: number;
  ordem: number;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface QuestoesSemanas {
  id: string;
  titulo: string;
  descricao?: string;
  numero_semana: number;
  ano: number;
  concurso_id?: string;
  questoes: unknown[];
  data_publicacao: Date;
  data_expiracao?: Date;
  dificuldade: string;
  disciplina?: string;
  assunto?: string;
  pontos: number;
  ativo: boolean;
  criado_em: Date;
}

export interface CartaoMemorizacao {
  id: string;
  frente: string;
  verso: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Apostila {
  id: string;
  titulo: string;
  slug: string;
  descricao?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: string[];
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface ConteudoApostila {
  id: string;
  apostila_id: string;
  concurso_id?: string;
  numero_modulo: number;
  titulo: string;
  conteudo_json: unknown;
  criado_em: Date;
}

export interface PlanoEstudo {
  id: string;
  usuario_id: string;
  titulo?: string;
  descricao?: string;
  concurso_id?: string;
  categoria_id?: string;
  data_inicio: Date;
  data_fim: Date;
  meta_horas_diarias: number;
  dias_semana: number[];
  cronograma: unknown;
  observacoes?: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

// Tipos de resposta da API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  erros?: string[];
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipos de progresso do usuário
export interface ProgressoUsuarioSimulado {
  id: string;
  usuario_id: string;
  simulado_id: string;
  pontuacao: number;
  tempo_gasto_minutos: number;
  respostas: Record<string, unknown>;
  concluido_em?: Date;
}

export interface ProgressoUsuarioFlashcard {
  id: string;
  usuario_id: string;
  flashcard_id: string;
  status: 'nao_iniciado' | 'aprendendo' | 'revisando' | 'dominado';
  contador_revisoes: number;
  proxima_revisao?: Date;
  atualizado_em: Date;
}

export interface ProgressoUsuarioApostila {
  id: string;
  usuario_id: string;
  conteudo_apostila_id: string;
  concluido: boolean;
  percentual_progresso: number;
  atualizado_em: Date;
}

// Tipos para o Guru da Aprovação
export interface MetricasGuruAprovacao {
  questoes_respondidas: number;
  meta_questoes: number;
  percentual_questoes: number;
  proficiencia_flashcards: number;
  progresso_apostilas: number;
  consistencia_estudo: number;
  pontuacao_geral: number;
  distancia_aprovacao: number;
  tempo_estimado_aprovacao: string;
}

// Tipos para autenticação
export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  usuario: Omit<Usuario, 'senha_hash'>;
  token: string;
  primeiro_login: boolean;
}

export interface CriarUsuarioRequest {
  nome: string;
  email: string;
  senha: string;
  concurso_id?: string;
}

// Tipos para configuração inicial
export interface ConfiguracaoInicialRequest {
  concurso_id: string;
  horas_estudo_diarias: number;
  tempo_ate_prova_meses: number;
}

// Tipos para cache
export interface CacheConfig {
  chave_cache: string;
  ttl_minutos: number;
  descricao?: string;
}

export interface CacheData {
  chave: string;
  dados: unknown;
  expira_em: Date;
}

// Tipos para logs e auditoria
export interface LogAuditoria {
  id: string;
  usuario_id?: string;
  acao: string;
  nome_tabela: string;
  id_registro?: string;
  valores_antigos?: Record<string, unknown>;
  valores_novos?: Record<string, unknown>;
  endereco_ip?: string;
  user_agent?: string;
  criado_em: Date;
}

// Tipos para métricas do sistema
export interface MetricaSistema {
  tipo: string;
  valor: number;
  unidade?: string;
  detalhes?: string;
  coletado_em: Date;
}

// Tipos para validação
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface DatabaseError {
  code: string;
  message: string;
  detail?: string;
}

// Tipos para filtros e busca
export interface FiltroBase {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FiltroConcurso extends FiltroBase {
  categoria_id?: string;
  ativo?: boolean;
  ano?: number;
  banca?: string;
}

export interface FiltroSimulado extends FiltroBase {
  concurso_id?: string;
  categoria_id?: string;
  dificuldade?: string;
  publico?: boolean;
}

export interface FiltroQuestoesSemanas extends FiltroBase {
  concurso_id?: string;
  ano?: number;
  numero_semana?: number;
  disciplina?: string;
}

// Tipos para estatísticas
export interface EstatisticasUsuario {
  total_simulados_realizados: number;
  media_pontuacao_simulados: number;
  total_questoes_semanais_respondidas: number;
  total_flashcards_dominados: number;
  total_apostilas_concluidas: number;
  tempo_total_estudo_horas: number;
  sequencia_dias_estudo: number;
  ultima_atividade: Date;
  total_acertos: number; // Adicionado para alinhar com o uso
}

export interface EstatisticasDisciplina {
  disciplina: string;
  total_questoes: number;
  total_acertos: number;
  percentual_acerto: number;
  tempo_medio_resposta: number;
  ultima_atividade: Date;
}

// Tipos para relatórios
export interface RelatorioDesempenho {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  estatisticas_gerais: EstatisticasUsuario;
  estatisticas_por_disciplina: EstatisticasDisciplina[];
  evolucao_pontuacao: Array<{
    data: Date;
    pontuacao: number;
  }>;
  metas_atingidas: Array<{
    meta: string;
    atingida: boolean;
    percentual: number;
  }>;
}

export type StatusProgresso = 'nao_iniciado' | 'em_andamento' | 'concluido';
export type NivelDificuldade = 'facil' | 'medio' | 'dificil';
export type TipoConteudo = 'simulado' | 'questao_semanal' | 'flashcard' | 'apostila' | 'plano_estudo';




