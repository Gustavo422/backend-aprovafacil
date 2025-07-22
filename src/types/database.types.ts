// Tipos gerados automaticamente baseados no schema do banco de dados
// Última atualização: 2025-07-06T21:18:33.623Z
// Baseado no schema atual do banco (tabela usuarios real)

export interface usuarios {
  id?: string;
  nome: string;
  email: string;
  ultimo_login?: Date;
  criado_em?: Date;
  atualizado_em?: Date;
  total_questoes_respondidas?: number;
  total_resposta_corretas?: number;
  tempo_estudo_minutos?: number;
  pontuacao_media?: number;
}

export type usuariosInsert = Omit<usuarios, 'id' | 'criado_em' | 'atualizado_em'> & {
  total_questoes_respondidas?: number;
  total_resposta_corretas?: number;
  tempo_estudo_minutos?: number;
  pontuacao_media?: number;
};

export type usuariosUpdate = Partial<Omit<usuarios, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface categorias_concursos {
  id?: string;
  nome: string;
  slug: string;
  descricao?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  ativo?: boolean;
  criado_em?: Date;
  atualizado_em?: Date;
}

export type categorias_concursosInsert = Omit<categorias_concursos, 'id' | 'criado_em' | 'atualizado_em'> & {
  cor_primaria?: string;
  cor_secundaria?: string;
  ativo?: boolean;
};

export type categorias_concursosUpdate = Partial<Omit<categorias_concursos, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface disciplinas_categoria {
  id?: string;
  categoria_id: string;
  nome: string;
  peso: number;
  horas_semanais: number;
  ordem?: number;
  ativo?: boolean;
  criado_em?: Date;
  atualizado_em?: Date;
}

export type disciplinas_categoriaInsert = Omit<disciplinas_categoria, 'id' | 'criado_em' | 'atualizado_em'> & {
  ordem?: number;
  ativo?: boolean;
};

export type disciplinas_categoriaUpdate = Partial<Omit<disciplinas_categoria, 'id' | 'criado_em' | 'atualizado_em'>>;

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
  ativo?: boolean;
  criado_em?: Date;
  atualizado_em?: Date;
}

export type ConcursosInsert = Omit<Concursos, 'id' | 'criado_em' | 'atualizado_em'> & {
  ativo?: boolean;
};

export type ConcursosUpdate = Partial<Omit<Concursos, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface Simulados_personalizados {
  id?: string;
  titulo: string;
  descricao?: string;
  questions_count?: number;
  time_minutes?: number;
  dificuldade?: string;
  criado_em?: Date;
  atualizado_em?: Date;
  deleted_at?: Date;
  concurso_id?: string;
  is_public?: boolean;
  created_by?: string;
  categoria_id?: string;
  disciplinas?: unknown;
  slug?: string;
}

export type Simulados_personalizadosInsert = Omit<Simulados_personalizados, 'id' | 'criado_em' | 'atualizado_em'> & {
  questions_count?: number;
  time_minutes?: number;
  dificuldade?: string;
  is_public?: boolean;
};

export type Simulados_personalizadosUpdate = Partial<Omit<Simulados_personalizados, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface questoes_simulado {
  id?: string;
  simulado_id: string;
  question_number: number;
  enunciado: string;
  alternativas: unknown;
  resposta_correta: string;
  explicacao?: string;
  tema?: string;
  dificuldade?: string;
  deleted_at?: Date;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  disciplina?: string;
  criado_em?: Date;
  atualizado_em?: Date;
}

export type questoes_simuladoInsert = Omit<questoes_simulado, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type questoes_simuladoUpdate = Partial<Omit<questoes_simulado, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface progresso_usuario_simulado {
  id?: string;
  user_id: string;
  simulado_id: string;
  score: number;
  time_taken_minutes: number;
  answers: unknown;
  concluido_at?: Date;
}

export type progresso_usuario_simuladoInsert = Omit<progresso_usuario_simulado, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type progresso_usuario_simuladoUpdate = Partial<Omit<progresso_usuario_simulado, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface Cartoes_memorizacao {
  id?: string;
  front: string;
  back: string;
  tema: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  criado_em?: Date;
  disciplina: string;
}

export type Cartoes_memorizacaoInsert = Omit<Cartoes_memorizacao, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type Cartoes_memorizacaoUpdate = Partial<Omit<Cartoes_memorizacao, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface progresso_usuario_flashcard {
  id?: string;
  user_id: string;
  flashcard_id: string;
  next_review?: Date;
  status?: string;
  review_count?: number;
  atualizado_em?: Date;
}

export type progresso_usuario_flashcardInsert = Omit<progresso_usuario_flashcard, 'id' | 'criado_em' | 'atualizado_em'> & {
  status?: string;
  review_count?: number;
};

export type progresso_usuario_flashcardUpdate = Partial<Omit<progresso_usuario_flashcard, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface Apostila_inteligente {
  id?: string;
  titulo: string;
  criado_em?: Date;
  descricao?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: unknown;
  slug?: string;
  created_by?: string;
}

export type Apostila_inteligenteInsert = Omit<Apostila_inteligente, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type Apostila_inteligenteUpdate = Partial<Omit<Apostila_inteligente, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface conteudo_apostila {
  id?: string;
  apostila_id: string;
  module_number: number;
  titulo: string;
  content_json: unknown;
  concurso_id?: string;
  criado_em?: Date;
}

export type conteudo_apostilaInsert = Omit<conteudo_apostila, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type conteudo_apostilaUpdate = Partial<Omit<conteudo_apostila, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface progresso_usuario_apostila {
  id?: string;
  user_id: string;
  conteudo_apostila_id: string;
  concluido?: boolean;
  percentual_progresso?: number;
  atualizado_em?: Date;
}

export type progresso_usuario_apostilaInsert = Omit<progresso_usuario_apostila, 'id' | 'criado_em' | 'atualizado_em'> & {
  concluido?: boolean;
  percentual_progresso?: number;
};

export type progresso_usuario_apostilaUpdate = Partial<Omit<progresso_usuario_apostila, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface Questoes_semanais {
  id?: string;
  titulo: string;
  descricao?: string;
  week_number: number;
  year: number;
  concurso_id?: string;
  criado_em?: Date;
}

export type Questoes_semanaisInsert = Omit<Questoes_semanais, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type Questoes_semanaisUpdate = Partial<Omit<Questoes_semanais, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface progresso_usuario_questoes_semanais {
  id?: string;
  user_id: string;
  questoes_semanais_id: string;
  score: number;
  answers: unknown;
  concluido_at?: Date;
}

export type progresso_usuario_questoes_semanaisInsert = Omit<progresso_usuario_questoes_semanais, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type progresso_usuario_questoes_semanaisUpdate = Partial<Omit<progresso_usuario_questoes_semanais, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface Mapa_assuntos {
  id?: string;
  tema: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  criado_em?: Date;
  disciplina: string;
}

export type Mapa_assuntosInsert = Omit<Mapa_assuntos, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type Mapa_assuntosUpdate = Partial<Omit<Mapa_assuntos, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface progresso_usuario_mapa_assuntos {
  id?: string;
  user_id: string;
  mapa_assunto_id: string;
  status?: string;
  atualizado_em?: Date;
}

export type progresso_usuario_mapa_assuntosInsert = Omit<progresso_usuario_mapa_assuntos, 'id' | 'criado_em' | 'atualizado_em'> & {
  status?: string;
};

export type progresso_usuario_mapa_assuntosUpdate = Partial<Omit<progresso_usuario_mapa_assuntos, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface Planos_estudo {
  id?: string;
  user_id: string;
  concurso_id?: string;
  start_date: Date;
  end_date: Date;
  schedule: unknown;
  criado_em?: Date;
}

export type Planos_estudoInsert = Omit<Planos_estudo, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type Planos_estudoUpdate = Partial<Omit<Planos_estudo, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface preferencias_usuario_concurso {
  id?: string;
  usuario_id: string;
  concurso_id: string;
  pode_alterar_ate: Date;
  selecionado_em?: Date;
  ativo?: boolean;
  criado_em?: Date;
  atualizado_em?: Date;
}

export type preferencias_usuario_concursoInsert = Omit<preferencias_usuario_concurso, 'id' | 'criado_em' | 'atualizado_em'> & {
  selecionado_em?: Date;
  ativo?: boolean;
};

export type preferencias_usuario_concursoUpdate = Partial<Omit<preferencias_usuario_concurso, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface estatisticas_usuario_disciplina {
  id?: string;
  user_id: string;
  total_questions?: number;
  resposta_corretas?: number;
  pontuacao_media?: number;
  tempo_estudo_minutos?: number;
  last_activity?: Date;
  criado_em?: Date;
  atualizado_em?: Date;
  disciplina: string;
}

export type estatisticas_usuario_disciplinaInsert = Omit<estatisticas_usuario_disciplina, 'id' | 'criado_em' | 'atualizado_em'> & {
  total_questions?: number;
  resposta_corretas?: number;
  pontuacao_media?: number;
  tempo_estudo_minutos?: number;
  last_activity?: Date;
};

export type estatisticas_usuario_disciplinaUpdate = Partial<Omit<estatisticas_usuario_disciplina, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface User_performance_cache {
  id?: string;
  user_id: string;
  cache_key: string;
  cache_data: unknown;
  expires_at: Date;
  criado_em?: Date;
  atualizado_em?: Date;
}

export type User_performance_cacheInsert = Omit<User_performance_cache, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type User_performance_cacheUpdate = Partial<Omit<User_performance_cache, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface logs_auditoria {
  id?: string;
  user_id?: string;
  action: string;
  table_nome: string;
  record_id?: string;
  old_values?: unknown;
  new_values?: unknown;
  ip_address?: string;
  user_agent?: string;
  criado_em?: Date;
}

export type logs_auditoriaInsert = Omit<logs_auditoria, 'id' | 'criado_em' | 'atualizado_em'> & {
};

export type logs_auditoriaUpdate = Partial<Omit<logs_auditoria, 'id' | 'criado_em' | 'atualizado_em'>>;

export interface Cache_config {
  id?: string;
  cache_key: string;
  descricao?: string;
  ttl_minutes?: number;
  criado_em?: Date;
  atualizado_em?: Date;
}

export type Cache_configInsert = Omit<Cache_config, 'id' | 'criado_em' | 'atualizado_em'> & {
  ttl_minutes?: number;
};

export type Cache_configUpdate = Partial<Omit<Cache_config, 'id' | 'criado_em' | 'atualizado_em'>>;

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
export interface usuariostats {
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  studyTimeMinutes: number;
  averageScore: number;
  UltimoLogin?: Date;
}

export interface disciplinaStats {
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
  descricao?: string;
  ttlMinutes: number;
}

// Tipos para logs de auditoria
export interface AuditLog {
  user_id?: string;
  action: string;
  table_nome: string;
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
  concluido_at?: Date;
}

// Tipos para progresso de questões semanais
export interface QuestoesSemanaisProgress {
  user_id: string;
  questoes_semanais_id: string;
  score: number;
  answers: unknown;
  concluido_at?: Date;
}

// Tipos para progresso de apostila
export interface ApostilaProgress {
  user_id: string;
  conteudo_apostila_id: string;
  concluido: boolean;
  percentual_progresso: number;
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
  pode_alterar_ate: Date;
  selecionado_em?: Date;
  ativo?: boolean;
}

// Tipos para estatísticas de disciplina (renomeado para evitar conflito)
export interface UserdisciplinaStatsDetail {
  user_id: string;
  disciplina: string;
  total_questions: number;
  resposta_corretas: number;
  pontuacao_media: number;
  tempo_estudo_minutos: number;
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
  titulo: string;
  descricao?: string;
  questions_count: number;
  time_minutes: number;
  dificuldade: string;
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
  enunciado: string;
  alternativas: unknown;
  resposta_correta: string;
  explicacao?: string;
  tema?: string;
  dificuldade?: string;
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
  titulo: string;
  descricao?: string;
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
  titulo: string;
  content_json: unknown;
  concurso_id?: string;
}

// Tipos para questões semanais
export interface QuestoesSemanais {
  titulo: string;
  descricao?: string;
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
  ativo?: boolean;
}

// Tipos para disciplinas de categoria
export interface CategoriaDisciplina {
  categoria_id: string;
  nome: string;
  peso: number;
  horas_semanais: number;
  ordem: number;
  ativo?: boolean;
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
  ativo?: boolean;
}

// Tipos para usuários (baseado no schema real do banco)
export interface User {
  id?: string;
  nome: string;
  email: string;
  ultimo_login?: Date;
  criado_em?: Date;
  atualizado_em?: Date;
  total_questoes_respondidas?: number;
  total_resposta_corretas?: number;
  tempo_estudo_minutos?: number;
  pontuacao_media?: number;
}

// Tipos para logs de auditoria (renomeado para evitar conflito)
export interface AuditLogEntry {
  user_id?: string;
  action: string;
  table_nome: string;
  record_id?: string;
  old_values?: unknown;
  new_values?: unknown;
  ip_address?: string;
  user_agent?: string;
}

// Tipos para configuração de cache (renomeado para evitar conflito)
export interface CacheConfigSettings {
  cache_key: string;
  descricao?: string;
  ttl_minutes: number;
}
