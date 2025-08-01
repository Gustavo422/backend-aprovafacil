import type {
  Simulado,
  SimuladoQuestion,
  Flashcard,
  Apostila,
  MapaAssunto,
  UserdisciplinaStats
} from '@/src/core/database/types';

export interface Concurso {
  id: string;
  nome: string;
  categoria_id: string;
  banca: string;
  ano: number;
  edital_url?: string | null;
  data_prova?: string | null;
  vagas?: number | null;
  salario?: number | null;
  criado_em: string;
  atualizado_em: string;
  criado_por?: string | null;
  deletado_em?: string | null;
  ativo?: boolean;
}

type Tables = Database['public']['Tables'];

// Tipo auxiliar para Concurso com Categoria
export interface ConcursoComCategoria extends Concurso {
  categorias_concursos: ConcursoCategoria;
}

// Tipos específicos estendidos ou modificados
// Categorias de Concurso
export type ConcursoCategoria = Tables['categorias_concursos']['Row'] & {
  created_by?: string | null;
  deleted_at?: string | null;
};

export type ConcursoCategoriaInsert = Tables['categorias_concursos']['Insert'];
export type ConcursoCategoriaUpdate = Tables['categorias_concursos']['Update'];

// Disciplinas por Categoria
export type CategoriaDisciplina = Tables['disciplinas_categoria']['Row'] & {
  created_by?: string | null;
  deleted_at?: string | null;
  disciplina_nome?: string;
  disciplina_descricao?: string | null;
  ordem?: number;
  carga_horaria_semanal?: number;
  is_obrigatoria?: boolean;
  is_ativo?: boolean;
};
export type CategoriaDisciplinaInsert = Tables['disciplinas_categoria']['Insert'];
export type CategoriaDisciplinaUpdate = Tables['disciplinas_categoria']['Update'];

export interface UserConcursoPreference {
  id: string;
  usuario_id: string;
  concurso_id: string;
  categoria_id: string;
  favorito: boolean;
  pode_alterar_ate: string; // ISO date string
  criado_em: string;
  atualizado_em: string;
  criado_por?: string | null;
  deletado_em?: string | null;
  ativo?: boolean;
}

// ========================================
// ENUMS E CONSTANTES
// ========================================

export type ConcursoCategoriaSlug = 
  | 'guarda-municipal'
  | 'policia-civil'
  | 'tribunais'
  | 'receita-federal'
  | 'banco-brasil'
  | 'correios'
  | 'petrobras'
  | 'concurso-publico'
  | 'vestibular';

export type BancaOrganizadora = 
  | 'CESPE/CEBRASPE'
  | 'CESGRANRIO'
  | 'FGV'
  | 'VUNESP'
  | 'FEPESE'
  | 'FUNDEP'
  | 'IADES'
  | 'INEP'
  | 'FUVEST';

export type NivelDificuldade = 'Fácil' | 'Médio' | 'Difícil';

export type StatusAssunto = 'não_iniciado' | 'em_andamento' | 'concluído' | 'revisão';

// ========================================
// TIPOS DE RELACIOnomeNTOS
// ========================================

// Simulado com Concurso
export interface SimuladoComConcurso extends Simulado {
  concursos: ConcursoComCategoria | null;
}

// Simulado com Questões
export interface SimuladoComQuestoes extends Simulado {
  questoes_simulado: SimuladoQuestion[];
  concursos: ConcursoComCategoria | null;
}

// Flashcard com Concurso (REFATORADO)
export interface FlashcardComConcurso extends Flashcard {
  concursos: ConcursoComCategoria | null;
}

// Apostila com Concurso
export interface ApostilaComConcurso extends Apostila {
  concursos: ConcursoComCategoria | null;
}

// Mapa de Assunto com Concurso
export interface MapaAssuntoComConcurso extends MapaAssunto {
  concursos: ConcursoComCategoria | null;
}

// Concurso com Categoria e Disciplinas
export interface ConcursoCompleto extends ConcursoComCategoria {
  disciplinas_categoria: CategoriaDisciplina[];
}

// ========================================
// TIPOS DE CONTEXTO
// ========================================

export interface ConcursoContext {
  categoria: ConcursoCategoria;
  concurso: Concurso;
  disciplinas: CategoriaDisciplina[];
  userPreference: UserConcursoPreference;
}

export interface ConcursoContextWithContent extends ConcursoContext {
  simulados: SimuladoComConcurso[];
  flashcards: FlashcardComConcurso[];
  apostilas: ApostilaComConcurso[];
  mapaAssuntos: MapaAssuntoComConcurso[];
}

// ========================================
// TIPOS DE FILTROS
// ========================================

export interface ConcursoFilters {
  categoria_slug?: ConcursoCategoriaSlug;
  banca?: BancaOrganizadora;
  ano?: number;
  ativo?: boolean;
}

export interface ConteudoFilters {
  categoria_id?: string;
  disciplina?: string;
  dificuldade?: NivelDificuldade;
  is_public?: boolean;
}

// ========================================
// TIPOS DE PROGRESSO
// ========================================

export interface UserProgress {
  simulados_completados: number;
  questoes_respondidas: number;
  questoes_corretas: number;
  tempo_total_estudo: number; // em minutos
  pontuacao_geral: number;
  ultima_atividade: string;
}

export interface DisciplinaProgress {
  disciplina_id: string;
  disciplina_nome: string;
  simulados_completados: number;
  questoes_respondidas: number;
  questoes_corretas: number;
  tempo_estudo: number; // em minutos
  pontuacao: number;
  ultima_atividade: string;
}

export interface ConcursoProgress {
  concurso_id: string;
  categoria_id: string;
  progresso_geral: UserProgress;
  progresso_disciplinas: DisciplinaProgress[];
  ultima_atualizacao: string;
}

// ========================================
// TIPOS DE PLANO DE ESTUDO
// ========================================

export interface PlanoEstudoCronograma {
  [disciplina: string]: {
    horas_semanais: number;
    assuntos: string[];
    simulados_planejados: string[];
    flashcards_planejados: string[];
  };
}

export interface PlanoEstudoPersonalizado {
  id: string;
  usuario_id: string;
  concurso_id: string;
  categoria_id: string;
  data_inicio: string;
  data_fim: string;
  horas_diarias: number;
  cronograma: PlanoEstudoCronograma;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  created_by?: string | null;
  deleted_at?: string | null;
}

// ========================================
// TIPOS DE VALIDAÇÃO
// ========================================

export interface ConcursoValidation {
  nome: string;
  categoria_id: string;
  banca: BancaOrganizadora;
  ano: number;
  edital_url?: string;
  data_prova?: string;
  vagas?: number;
  salario?: number;
}

export interface DisciplinaValidation {
  nome: string;
  peso: number; // 1-100
  horas_semanais: number; // >= 1
  ordem: number;
}

// ========================================
// TIPOS DE RESPOSTA DE API
// ========================================

export interface ConcursoApiResponse {
  data?: ConcursoComCategoria;
  error?: string;
  message?: string;
}

export interface ConteudoFiltradoResponse {
  data: {
    simulados: SimuladoComConcurso[];
    flashcards: FlashcardComConcurso[];
    apostilas: ApostilaComConcurso[];
    mapaAssuntos: MapaAssuntoComConcurso[];
  };
  total: number;
  page: number;
  limit: number;
}

export interface UserPreferenceResponse {
  data?: UserConcursoPreference;
  canChange: boolean;
  daysUntilChange?: number;
  error?: string;
}

// ========================================
// TIPOS DE CONFIGURAÇÃO
// ========================================

export interface CategoriaConfig {
  nome: string;
  slug: ConcursoCategoriaSlug;
  descricao: string;
  cor_primaria: string;
  cor_secundaria: string;
  disciplinas: DisciplinaValidation[];
}

export interface SistemaConfig {
  max_troca_concurso_dias: number; // 120 dias (4 meses)
  max_horas_estudo_dia: number; // 8 horas
  max_simulados_semana: number; // 10 simulados
  max_flashcards_dia: number; // 50 flashcards
}

// ========================================
// TIPOS DE EVENTOS E AUDITORIA
// ========================================

export interface ConcursoSelectionEvent {
  usuario_id: string;
  concurso_id: string;
  categoria_id: string;
  selecionado_em: string;
  pode_alterar_ate: string;
}

export interface ConteudoAccessEvent {
  usuario_id: string;
  concurso_id: string;
  categoria_id: string;
  tipo_conteudo: 'simulado' | 'flashcard' | 'apostila' | 'mapa_assunto';
  conteudo_id: string;
  accessed_at: string;
}

// ========================================
// TIPOS DE CACHE
// ========================================

export interface ConteudoCache {
  key: string;
  data: ConteudoFiltradoResponse;
  expires_at: string;
  categoria_id: string;
}

export interface UserProgressCache {
  key: string;
  data: UserProgress;
  expires_at: string;
  usuario_id: string;
  concurso_id: string;
}

export interface CacheStats {
  total_entries: number;
  memory_usage: number;
  hit_rate: number;
  last_cleanup: string;
}

// ========================================
// TIPOS DE ESTATÍSTICAS AVANÇADAS
// ========================================

export interface UserdisciplinaStatsExtended extends UserdisciplinaStats {
  disciplina_nome: string;
  categoria_nome: string;
  progresso_percentual: number;
  ranking_posicao?: number;
  tempo_medio_questao: number; // em segundos
  taxa_acerto: number; // 0-100
}

export interface ConcursoStats {
  concurso_id: string;
  total_usuarios: number;
  media_pontuacao: number;
  simulados_completados: number;
  tempo_medio_estudo: number;
  disciplinas_mais_dificies: string[];
  disciplinas_mais_faceis: string[];
}

// ========================================
// TIPOS DE NOTIFICAÇÕES E ALERTAS
// ========================================

export interface StudyReminder {
  usuario_id: string;
  concurso_id: string;
  tipo: 'simulado' | 'flashcard' | 'revisao' | 'meta_diaria';
  mensagem: string;
  data_lembrete: string;
  is_read: boolean;
}

export interface Achievement {
  usuario_id: string;
  concurso_id: string;
  tipo: 'simulados_completados' | 'questoes_corretas' | 'tempo_estudo' | 'disciplina_mastery';
  titulo: string;
  descricao: string;
  icone: string;
  data_conquista: string;
  valor_atingido: number;
  valor_meta: number;
}

// ========================================
// TIPOS DE EXPORTAÇÃO E RELATÓRIOS
// ========================================

export interface StudyReport {
  usuario_id: string;
  concurso_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  resumo: {
    tempo_total_estudo: number;
    simulados_completados: number;
    questoes_respondidas: number;
    taxa_acerto_geral: number;
    disciplinas_estudadas: string[];
  };
  progresso_disciplinas: DisciplinaProgress[];
  simulados_realizados: {
    id: string;
    nome: string;
    data: string;
    pontuacao: number;
    tempo_gasto: number;
  }[];
  recomendacoes: string[];
}

// ========================================
// TIPOS DE UTILITÁRIOS
// ========================================

export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: SortOrder;
}

export interface SearchParams {
  query?: string;
  filters?: ConteudoFilters;
  pagination?: PaginationParams;
}

// ========================================
// TIPOS DE ERRO E VALIDAÇÃO
// ========================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: ValidationError[];
  timestamp: string;
}

// ========================================
// TIPOS DE SEGURANÇA E AUTORIZAÇÃO
// ========================================

export interface ContentAccess {
  usuario_id: string;
  concurso_id: string;
  tipo_conteudo: 'simulado' | 'flashcard' | 'apostila' | 'mapa_assunto';
  conteudo_id: string;
  nivel_acesso: 'read' | 'write' | 'admin';
  expires_at?: string;
}

export interface UserPermissions {
  usuario_id: string;
  concurso_id: string;
  can_access_content: boolean;
  can_modify_preferences: boolean;
  can_view_statistics: boolean;
  can_export_data: boolean;
  permissions_granted_at: string;
  permissions_expire_at?: string;
}
