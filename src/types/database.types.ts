// Tipos gerados automaticamente baseados no schema do banco de dados
// Última atualização: 2025-07-06T21:18:33.623Z
// Baseado no schema atual do banco (tabela users real)

export interface Users {
  id?: string;
  name: string;
  email: string;
  last_login?: Date;
  created_at?: Date;
  updated_at?: Date;
  total_questions_answered?: number;
  total_correct_answers?: number;
  study_time_minutes?: number;
  average_score?: number;
}

export type UsersInsert = Omit<Users, 'id' | 'created_at' | 'updated_at'> & {
  total_questions_answered?: number;
  total_correct_answers?: number;
  study_time_minutes?: number;
  average_score?: number;
};

export type UsersUpdate = Partial<Omit<Users, 'id' | 'created_at' | 'updated_at'>>;

export interface Concurso_categorias {
  id?: string;
  nome: string;
  slug: string;
  descricao?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type Concurso_categoriasInsert = Omit<Concurso_categorias, 'id' | 'created_at' | 'updated_at'> & {
  cor_primaria?: string;
  cor_secundaria?: string;
  is_active?: boolean;
};

export type Concurso_categoriasUpdate = Partial<Omit<Concurso_categorias, 'id' | 'created_at' | 'updated_at'>>;

export interface Categoria_disciplinas {
  id?: string;
  categoria_id: string;
  nome: string;
  peso: number;
  horas_semanais: number;
  ordem?: number;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type Categoria_disciplinasInsert = Omit<Categoria_disciplinas, 'id' | 'created_at' | 'updated_at'> & {
  ordem?: number;
  is_active?: boolean;
};

export type Categoria_disciplinasUpdate = Partial<Omit<Categoria_disciplinas, 'id' | 'created_at' | 'updated_at'>>;

export interface Concursos {
  id?: string;
  nome: string;
  descricao?: string;
  ano?: number;
  banca?: string;
  categoria_id?: string;
  edital_url?: string;
  data_prova?: Date;
  vagas?: number;
  salario?: number;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type ConcursosInsert = Omit<Concursos, 'id' | 'created_at' | 'updated_at'> & {
  is_active?: boolean;
};

export type ConcursosUpdate = Partial<Omit<Concursos, 'id' | 'created_at' | 'updated_at'>>;

export interface Simulados_personalizados {
  id?: string;
  title: string;
  description?: string;
  questions_count?: number;
  time_minutes?: number;
  difficulty?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
  concurso_id?: string;
  is_public?: boolean;
  created_by?: string;
  categoria_id?: string;
  disciplinas?: unknown;
  slug?: string;
}

export type Simulados_personalizadosInsert = Omit<Simulados_personalizados, 'id' | 'created_at' | 'updated_at'> & {
  questions_count?: number;
  time_minutes?: number;
  difficulty?: string;
  is_public?: boolean;
};

export type Simulados_personalizadosUpdate = Partial<Omit<Simulados_personalizados, 'id' | 'created_at' | 'updated_at'>>;

export interface Simulado_questions {
  id?: string;
  simulado_id: string;
  question_number: number;
  question_text: string;
  alternatives: unknown;
  correct_answer: string;
  explanation?: string;
  topic?: string;
  difficulty?: string;
  deleted_at?: Date;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  disciplina?: string;
  created_at?: Date;
  updated_at?: Date;
  discipline?: string;
}

export type Simulado_questionsInsert = Omit<Simulado_questions, 'id' | 'created_at' | 'updated_at'> & {
};

export type Simulado_questionsUpdate = Partial<Omit<Simulado_questions, 'id' | 'created_at' | 'updated_at'>>;

export interface User_simulado_progress {
  id?: string;
  user_id: string;
  simulado_id: string;
  score: number;
  time_taken_minutes: number;
  answers: unknown;
  completed_at?: Date;
}

export type User_simulado_progressInsert = Omit<User_simulado_progress, 'id' | 'created_at' | 'updated_at'> & {
};

export type User_simulado_progressUpdate = Partial<Omit<User_simulado_progress, 'id' | 'created_at' | 'updated_at'>>;

export interface Cartoes_memorizacao {
  id?: string;
  front: string;
  back: string;
  tema: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  created_at?: Date;
  disciplina: string;
}

export type Cartoes_memorizacaoInsert = Omit<Cartoes_memorizacao, 'id' | 'created_at' | 'updated_at'> & {
};

export type Cartoes_memorizacaoUpdate = Partial<Omit<Cartoes_memorizacao, 'id' | 'created_at' | 'updated_at'>>;

export interface User_flashcard_progress {
  id?: string;
  user_id: string;
  flashcard_id: string;
  next_review?: Date;
  status?: string;
  review_count?: number;
  updated_at?: Date;
}

export type User_flashcard_progressInsert = Omit<User_flashcard_progress, 'id' | 'created_at' | 'updated_at'> & {
  status?: string;
  review_count?: number;
};

export type User_flashcard_progressUpdate = Partial<Omit<User_flashcard_progress, 'id' | 'created_at' | 'updated_at'>>;

export interface Apostila_inteligente {
  id?: string;
  title: string;
  created_at?: Date;
  description?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: unknown;
  slug?: string;
  created_by?: string;
}

export type Apostila_inteligenteInsert = Omit<Apostila_inteligente, 'id' | 'created_at' | 'updated_at'> & {
};

export type Apostila_inteligenteUpdate = Partial<Omit<Apostila_inteligente, 'id' | 'created_at' | 'updated_at'>>;

export interface Apostila_content {
  id?: string;
  apostila_id: string;
  module_number: number;
  title: string;
  content_json: unknown;
  concurso_id?: string;
  created_at?: Date;
}

export type Apostila_contentInsert = Omit<Apostila_content, 'id' | 'created_at' | 'updated_at'> & {
};

export type Apostila_contentUpdate = Partial<Omit<Apostila_content, 'id' | 'created_at' | 'updated_at'>>;

export interface User_apostila_progress {
  id?: string;
  user_id: string;
  apostila_content_id: string;
  completed?: boolean;
  progress_percentage?: number;
  updated_at?: Date;
}

export type User_apostila_progressInsert = Omit<User_apostila_progress, 'id' | 'created_at' | 'updated_at'> & {
  completed?: boolean;
  progress_percentage?: number;
};

export type User_apostila_progressUpdate = Partial<Omit<User_apostila_progress, 'id' | 'created_at' | 'updated_at'>>;

export interface Questoes_semanais {
  id?: string;
  title: string;
  description?: string;
  week_number: number;
  year: number;
  concurso_id?: string;
  created_at?: Date;
}

export type Questoes_semanaisInsert = Omit<Questoes_semanais, 'id' | 'created_at' | 'updated_at'> & {
};

export type Questoes_semanaisUpdate = Partial<Omit<Questoes_semanais, 'id' | 'created_at' | 'updated_at'>>;

export interface User_questoes_semanais_progress {
  id?: string;
  user_id: string;
  questoes_semanais_id: string;
  score: number;
  answers: unknown;
  completed_at?: Date;
}

export type User_questoes_semanais_progressInsert = Omit<User_questoes_semanais_progress, 'id' | 'created_at' | 'updated_at'> & {
};

export type User_questoes_semanais_progressUpdate = Partial<Omit<User_questoes_semanais_progress, 'id' | 'created_at' | 'updated_at'>>;

export interface Mapa_assuntos {
  id?: string;
  tema: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  created_at?: Date;
  disciplina: string;
}

export type Mapa_assuntosInsert = Omit<Mapa_assuntos, 'id' | 'created_at' | 'updated_at'> & {
};

export type Mapa_assuntosUpdate = Partial<Omit<Mapa_assuntos, 'id' | 'created_at' | 'updated_at'>>;

export interface User_mapa_assuntos_status {
  id?: string;
  user_id: string;
  mapa_assunto_id: string;
  status?: string;
  updated_at?: Date;
}

export type User_mapa_assuntos_statusInsert = Omit<User_mapa_assuntos_status, 'id' | 'created_at' | 'updated_at'> & {
  status?: string;
};

export type User_mapa_assuntos_statusUpdate = Partial<Omit<User_mapa_assuntos_status, 'id' | 'created_at' | 'updated_at'>>;

export interface Planos_estudo {
  id?: string;
  user_id: string;
  concurso_id?: string;
  start_date: Date;
  end_date: Date;
  schedule: unknown;
  created_at?: Date;
}

export type Planos_estudoInsert = Omit<Planos_estudo, 'id' | 'created_at' | 'updated_at'> & {
};

export type Planos_estudoUpdate = Partial<Omit<Planos_estudo, 'id' | 'created_at' | 'updated_at'>>;

export interface User_concurso_preferences {
  id?: string;
  user_id: string;
  concurso_id: string;
  can_change_until: Date;
  selected_at?: Date;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type User_concurso_preferencesInsert = Omit<User_concurso_preferences, 'id' | 'created_at' | 'updated_at'> & {
  selected_at?: Date;
  is_active?: boolean;
};

export type User_concurso_preferencesUpdate = Partial<Omit<User_concurso_preferences, 'id' | 'created_at' | 'updated_at'>>;

export interface User_discipline_stats {
  id?: string;
  user_id: string;
  total_questions?: number;
  correct_answers?: number;
  average_score?: number;
  study_time_minutes?: number;
  last_activity?: Date;
  created_at?: Date;
  updated_at?: Date;
  disciplina: string;
}

export type User_discipline_statsInsert = Omit<User_discipline_stats, 'id' | 'created_at' | 'updated_at'> & {
  total_questions?: number;
  correct_answers?: number;
  average_score?: number;
  study_time_minutes?: number;
  last_activity?: Date;
};

export type User_discipline_statsUpdate = Partial<Omit<User_discipline_stats, 'id' | 'created_at' | 'updated_at'>>;

export interface User_performance_cache {
  id?: string;
  user_id: string;
  cache_key: string;
  cache_data: unknown;
  expires_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

export type User_performance_cacheInsert = Omit<User_performance_cache, 'id' | 'created_at' | 'updated_at'> & {
};

export type User_performance_cacheUpdate = Partial<Omit<User_performance_cache, 'id' | 'created_at' | 'updated_at'>>;

export interface Audit_logs {
  id?: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: unknown;
  new_values?: unknown;
  ip_address?: string;
  user_agent?: string;
  created_at?: Date;
}

export type Audit_logsInsert = Omit<Audit_logs, 'id' | 'created_at' | 'updated_at'> & {
};

export type Audit_logsUpdate = Partial<Omit<Audit_logs, 'id' | 'created_at' | 'updated_at'>>;

export interface Cache_config {
  id?: string;
  cache_key: string;
  description?: string;
  ttl_minutes?: number;
  created_at?: Date;
  updated_at?: Date;
}

export type Cache_configInsert = Omit<Cache_config, 'id' | 'created_at' | 'updated_at'> & {
  ttl_minutes?: number;
};

export type Cache_configUpdate = Partial<Omit<Cache_config, 'id' | 'created_at' | 'updated_at'>>;

// Tipos de resposta da API
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipos para filtros e consultas
export interface BaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Tipos específicos para estatísticas
export interface UserStats {
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  studyTimeMinutes: number;
  averageScore: number;
  lastLogin?: Date;
}

export interface DisciplineStats {
  disciplina: string;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  studyTimeMinutes: number;
  lastActivity: Date;
}

// Tipos para configurações de cache
export interface CacheConfig {
  cacheKey: string;
  description?: string;
  ttlMinutes: number;
}

// Tipos para logs de auditoria
export interface AuditLog {
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: unknown;
  new_values?: unknown;
  ip_address?: string;
  user_agent?: string;
}

// Tipos para progresso de simulado
export interface SimuladoProgress {
  user_id: string;
  simulado_id: string;
  score: number;
  time_taken_minutes: number;
  answers: unknown;
  completed_at?: Date;
}

// Tipos para progresso de questões semanais
export interface QuestoesSemanaisProgress {
  user_id: string;
  questoes_semanais_id: string;
  score: number;
  answers: unknown;
  completed_at?: Date;
}

// Tipos para progresso de apostila
export interface ApostilaProgress {
  user_id: string;
  apostila_content_id: string;
  completed: boolean;
  progress_percentage: number;
}

// Tipos para progresso de flashcards
export interface FlashcardProgress {
  user_id: string;
  flashcard_id: string;
  next_review?: Date;
  status: string;
  review_count: number;
}

// Tipos para status de mapa de assuntos
export interface MapaAssuntosStatus {
  user_id: string;
  mapa_assunto_id: string;
  status: string;
}

// Tipos para planos de estudo
export interface PlanoEstudo {
  user_id: string;
  concurso_id?: string;
  start_date: Date;
  end_date: Date;
  schedule: unknown;
}

// Tipos para preferências de concurso
export interface ConcursoPreferences {
  user_id: string;
  concurso_id: string;
  can_change_until: Date;
  selected_at?: Date;
  is_active?: boolean;
}

// Tipos para estatísticas de disciplina (renomeado para evitar conflito)
export interface UserDisciplineStatsDetail {
  user_id: string;
  disciplina: string;
  total_questions: number;
  correct_answers: number;
  average_score: number;
  study_time_minutes: number;
  last_activity: Date;
}

// Tipos para cache de performance
export interface PerformanceCache {
  user_id: string;
  cache_key: string;
  cache_data: unknown;
  expires_at: Date;
}

// Tipos para simulados personalizados
export interface SimuladoPersonalizado {
  title: string;
  description?: string;
  questions_count: number;
  time_minutes: number;
  difficulty: string;
  concurso_id?: string;
  is_public?: boolean;
  created_by?: string;
  categoria_id?: string;
  disciplinas?: unknown;
  slug?: string;
}

// Tipos para questões de simulado
export interface SimuladoQuestion {
  simulado_id: string;
  question_number: number;
  question_text: string;
  alternatives: unknown;
  correct_answer: string;
  explanation?: string;
  topic?: string;
  difficulty?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  disciplina?: string;
}

// Tipos para cartões de memorização
export interface CartaoMemorizacao {
  front: string;
  back: string;
  tema: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  disciplina: string;
}

// Tipos para apostila inteligente
export interface ApostilaInteligente {
  title: string;
  description?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: unknown;
  slug?: string;
  created_by?: string;
}

// Tipos para conteúdo de apostila
export interface ApostilaContent {
  apostila_id: string;
  module_number: number;
  title: string;
  content_json: unknown;
  concurso_id?: string;
}

// Tipos para questões semanais
export interface QuestoesSemanais {
  title: string;
  description?: string;
  week_number: number;
  year: number;
  concurso_id?: string;
}

// Tipos para mapa de assuntos
export interface MapaAssuntos {
  tema: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  disciplina: string;
}

// Tipos para categorias de concurso
export interface ConcursoCategoria {
  nome: string;
  slug: string;
  descricao?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  is_active?: boolean;
}

// Tipos para disciplinas de categoria
export interface CategoriaDisciplina {
  categoria_id: string;
  nome: string;
  peso: number;
  horas_semanais: number;
  ordem: number;
  is_active?: boolean;
}

// Tipos para concursos
export interface Concurso {
  nome: string;
  descricao?: string;
  ano?: number;
  banca?: string;
  categoria_id?: string;
  edital_url?: string;
  data_prova?: Date;
  vagas?: number;
  salario?: number;
  is_active?: boolean;
}

// Tipos para usuários (baseado no schema real do banco)
export interface User {
  id?: string;
  name: string;
  email: string;
  last_login?: Date;
  created_at?: Date;
  updated_at?: Date;
  total_questions_answered?: number;
  total_correct_answers?: number;
  study_time_minutes?: number;
  average_score?: number;
}

// Tipos para logs de auditoria (renomeado para evitar conflito)
export interface AuditLogEntry {
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: unknown;
  new_values?: unknown;
  ip_address?: string;
  user_agent?: string;
}

// Tipos para configuração de cache (renomeado para evitar conflito)
export interface CacheConfigSettings {
  cache_key: string;
  description?: string;
  ttl_minutes: number;
}
