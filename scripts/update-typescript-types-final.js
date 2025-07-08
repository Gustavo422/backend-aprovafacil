const fs = require('fs');
const path = require('path');

// Schema atual baseado no que realmente existe no banco de dados
const schema = {
  users: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    email: { type: 'character varying', nullable: true },
    name: { type: 'text', nullable: false },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    total_questions_answered: { type: 'integer', nullable: true, default: '0' },
    total_correct_answers: { type: 'integer', nullable: true, default: '0' },
    study_time_minutes: { type: 'integer', nullable: true, default: '0' },
    average_score: { type: 'numeric', nullable: true, default: '0' },
    last_login: { type: 'timestamp with time zone', nullable: true },
    instance_id: { type: 'uuid', nullable: true },
    aud: { type: 'character varying', nullable: true },
    role: { type: 'character varying', nullable: true },
    encrypted_password: { type: 'character varying', nullable: true },
    email_confirmed_at: { type: 'timestamp with time zone', nullable: true },
    invited_at: { type: 'timestamp with time zone', nullable: true },
    confirmation_token: { type: 'character varying', nullable: true },
    confirmation_sent_at: { type: 'timestamp with time zone', nullable: true },
    recovery_token: { type: 'character varying', nullable: true },
    recovery_sent_at: { type: 'timestamp with time zone', nullable: true },
    email_change_token_new: { type: 'character varying', nullable: true },
    email_change: { type: 'character varying', nullable: true },
    email_change_sent_at: { type: 'timestamp with time zone', nullable: true },
    last_sign_in_at: { type: 'timestamp with time zone', nullable: true },
    raw_app_meta_data: { type: 'jsonb', nullable: true },
    raw_user_meta_data: { type: 'jsonb', nullable: true },
    is_super_admin: { type: 'boolean', nullable: true },
    phone: { type: 'character varying', nullable: true },
    phone_confirmed_at: { type: 'timestamp with time zone', nullable: true },
    phone_change: { type: 'character varying', nullable: true },
    phone_change_token: { type: 'character varying', nullable: true },
    phone_change_sent_at: { type: 'timestamp with time zone', nullable: true },
    confirmed_at: { type: 'timestamp with time zone', nullable: true },
    email_change_token_current: { type: 'character varying', nullable: true },
    email_change_confirm_status: { type: 'integer', nullable: true },
    banned_until: { type: 'timestamp with time zone', nullable: true },
    reauthentication_token: { type: 'character varying', nullable: true },
    reauthentication_sent_at: { type: 'timestamp with time zone', nullable: true },
    is_sso_user: { type: 'boolean', nullable: true },
    deleted_at: { type: 'timestamp with time zone', nullable: true },
    is_anonymous: { type: 'boolean', nullable: true }
  },
  concurso_categorias: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    nome: { type: 'character varying', nullable: false },
    slug: { type: 'character varying', nullable: false },
    descricao: { type: 'text', nullable: true },
    cor_primaria: { type: 'character varying', nullable: true, default: "'#2563EB'::character varying" },
    cor_secundaria: { type: 'character varying', nullable: true, default: "'#1E40AF'::character varying" },
    is_active: { type: 'boolean', nullable: true, default: 'true' },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  categoria_disciplinas: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    categoria_id: { type: 'uuid', nullable: false },
    nome: { type: 'character varying', nullable: false },
    peso: { type: 'integer', nullable: false },
    horas_semanais: { type: 'integer', nullable: false },
    ordem: { type: 'integer', nullable: false, default: '0' },
    is_active: { type: 'boolean', nullable: true, default: 'true' },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  concursos: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    nome: { type: 'character varying', nullable: false },
    descricao: { type: 'text', nullable: true },
    ano: { type: 'integer', nullable: true },
    banca: { type: 'character varying', nullable: true },
    categoria_id: { type: 'uuid', nullable: true },
    edital_url: { type: 'text', nullable: true },
    data_prova: { type: 'date', nullable: true },
    vagas: { type: 'integer', nullable: true },
    salario: { type: 'numeric', nullable: true },
    is_active: { type: 'boolean', nullable: true, default: 'true' },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  simulados_personalizados: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    title: { type: 'character varying', nullable: false },
    description: { type: 'text', nullable: true },
    questions_count: { type: 'integer', nullable: false, default: '0' },
    time_minutes: { type: 'integer', nullable: false, default: '60' },
    difficulty: { type: 'character varying', nullable: false, default: "'Médio'::character varying" },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    deleted_at: { type: 'timestamp with time zone', nullable: true },
    concurso_id: { type: 'uuid', nullable: true },
    is_public: { type: 'boolean', nullable: true, default: 'true' },
    created_by: { type: 'uuid', nullable: true },
    categoria_id: { type: 'uuid', nullable: true },
    disciplinas: { type: 'jsonb', nullable: true },
    slug: { type: 'character varying', nullable: true }
  },
  simulado_questions: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    simulado_id: { type: 'uuid', nullable: false },
    question_number: { type: 'integer', nullable: false },
    question_text: { type: 'text', nullable: false },
    alternatives: { type: 'jsonb', nullable: false },
    correct_answer: { type: 'character varying', nullable: false },
    explanation: { type: 'text', nullable: true },
    topic: { type: 'character varying', nullable: true },
    difficulty: { type: 'character varying', nullable: true },
    deleted_at: { type: 'timestamp with time zone', nullable: true },
    concurso_id: { type: 'uuid', nullable: true },
    categoria_id: { type: 'uuid', nullable: true },
    peso_disciplina: { type: 'integer', nullable: true },
    disciplina: { type: 'character varying', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    discipline: { type: 'character varying', nullable: true }
  },
  user_simulado_progress: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    simulado_id: { type: 'uuid', nullable: false },
    score: { type: 'numeric', nullable: false },
    time_taken_minutes: { type: 'integer', nullable: false },
    answers: { type: 'jsonb', nullable: false },
    completed_at: { type: 'timestamp with time zone', nullable: true }
  },
  cartoes_memorizacao: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    front: { type: 'text', nullable: false },
    back: { type: 'text', nullable: false },
    tema: { type: 'character varying', nullable: false },
    subtema: { type: 'character varying', nullable: true },
    concurso_id: { type: 'uuid', nullable: true },
    categoria_id: { type: 'uuid', nullable: true },
    peso_disciplina: { type: 'integer', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    disciplina: { type: 'character varying', nullable: false }
  },
  user_flashcard_progress: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    flashcard_id: { type: 'uuid', nullable: false },
    next_review: { type: 'timestamp with time zone', nullable: true },
    status: { type: 'character varying', nullable: false, default: "'não_iniciado'::character varying" },
    review_count: { type: 'integer', nullable: true, default: '0' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  apostila_inteligente: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    title: { type: 'character varying', nullable: false },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    description: { type: 'text', nullable: true },
    concurso_id: { type: 'uuid', nullable: true },
    categoria_id: { type: 'uuid', nullable: true },
    disciplinas: { type: 'jsonb', nullable: true },
    slug: { type: 'character varying', nullable: true },
    created_by: { type: 'uuid', nullable: true }
  },
  apostila_content: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    apostila_id: { type: 'uuid', nullable: false },
    module_number: { type: 'integer', nullable: false },
    title: { type: 'character varying', nullable: false },
    content_json: { type: 'jsonb', nullable: false },
    concurso_id: { type: 'uuid', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  user_apostila_progress: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    apostila_content_id: { type: 'uuid', nullable: false },
    completed: { type: 'boolean', nullable: true, default: 'false' },
    progress_percentage: { type: 'numeric', nullable: true, default: '0' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  questoes_semanais: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    title: { type: 'character varying', nullable: false },
    description: { type: 'text', nullable: true },
    week_number: { type: 'integer', nullable: false },
    year: { type: 'integer', nullable: false },
    concurso_id: { type: 'uuid', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  user_questoes_semanais_progress: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    questoes_semanais_id: { type: 'uuid', nullable: false },
    score: { type: 'numeric', nullable: false },
    answers: { type: 'jsonb', nullable: false },
    completed_at: { type: 'timestamp with time zone', nullable: true }
  },
  mapa_assuntos: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    tema: { type: 'character varying', nullable: false },
    subtema: { type: 'character varying', nullable: true },
    concurso_id: { type: 'uuid', nullable: true },
    categoria_id: { type: 'uuid', nullable: true },
    peso_disciplina: { type: 'integer', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    disciplina: { type: 'character varying', nullable: false }
  },
  user_mapa_assuntos_status: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    mapa_assunto_id: { type: 'uuid', nullable: false },
    status: { type: 'character varying', nullable: false, default: "'não_iniciado'::character varying" },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  planos_estudo: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    concurso_id: { type: 'uuid', nullable: true },
    start_date: { type: 'date', nullable: false },
    end_date: { type: 'date', nullable: false },
    schedule: { type: 'jsonb', nullable: false },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  user_concurso_preferences: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    concurso_id: { type: 'uuid', nullable: false },
    can_change_until: { type: 'timestamp with time zone', nullable: false },
    selected_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    is_active: { type: 'boolean', nullable: true, default: 'true' },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  user_discipline_stats: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    total_questions: { type: 'integer', nullable: true, default: '0' },
    correct_answers: { type: 'integer', nullable: true, default: '0' },
    average_score: { type: 'numeric', nullable: true, default: '0' },
    study_time_minutes: { type: 'integer', nullable: true, default: '0' },
    last_activity: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    disciplina: { type: 'character varying', nullable: false }
  },
  user_performance_cache: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    cache_key: { type: 'character varying', nullable: false },
    cache_data: { type: 'jsonb', nullable: false },
    expires_at: { type: 'timestamp with time zone', nullable: false },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  audit_logs: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: true },
    action: { type: 'character varying', nullable: false },
    table_name: { type: 'character varying', nullable: false },
    record_id: { type: 'uuid', nullable: true },
    old_values: { type: 'jsonb', nullable: true },
    new_values: { type: 'jsonb', nullable: true },
    ip_address: { type: 'inet', nullable: true },
    user_agent: { type: 'text', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  },
  cache_config: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    cache_key: { type: 'character varying', nullable: false },
    description: { type: 'text', nullable: true },
    ttl_minutes: { type: 'integer', nullable: false, default: '60' },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'CURRENT_TIMESTAMP' }
  }
};

// Mapeamento de tipos PostgreSQL para TypeScript
const typeMapping = {
  'uuid': 'string',
  'text': 'string',
  'character varying': 'string',
  'integer': 'number',
  'numeric': 'number',
  'boolean': 'boolean',
  'timestamp with time zone': 'Date',
  'date': 'Date',
  'jsonb': 'any',
  'inet': 'string'
};

// Função para converter tipo PostgreSQL para TypeScript
function getTypeScriptType(pgType) {
  return typeMapping[pgType] || 'any';
}

// Função para gerar interface TypeScript
function generateInterface(tableName, columns) {
  const interfaceName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
  let interfaceCode = `export interface ${interfaceName} {\n`;
  
  Object.entries(columns).forEach(([columnName, columnInfo]) => {
    const tsType = getTypeScriptType(columnInfo.type);
    const isOptional = columnInfo.nullable || columnInfo.default;
    const optionalMark = isOptional ? '?' : '';
    
    interfaceCode += `  ${columnName}${optionalMark}: ${tsType};\n`;
  });
  
  interfaceCode += '}\n\n';
  return interfaceCode;
}

// Função para gerar tipo de inserção (sem campos com default)
function generateInsertType(tableName, columns) {
  const interfaceName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
  let insertCode = `export type ${interfaceName}Insert = Omit<${interfaceName}, 'id' | 'created_at' | 'updated_at'> & {\n`;
  
  // Adicionar campos opcionais que têm default
  Object.entries(columns).forEach(([columnName, columnInfo]) => {
    if (columnInfo.default && columnName !== 'id' && columnName !== 'created_at' && columnName !== 'updated_at') {
      const tsType = getTypeScriptType(columnInfo.type);
      insertCode += `  ${columnName}?: ${tsType};\n`;
    }
  });
  
  insertCode += '};\n\n';
  return insertCode;
}

// Função para gerar tipo de atualização
function generateUpdateType(tableName) {
  const interfaceName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
  return `export type ${interfaceName}Update = Partial<Omit<${interfaceName}, 'id' | 'created_at' | 'updated_at'>>;\n\n`;
}

// Gerar código TypeScript
let typesCode = `// Tipos gerados automaticamente baseados no schema do banco de dados
// Última atualização: ${new Date().toISOString()}
// Baseado no schema atual do banco (incluindo colunas do Supabase Auth)

`;

// Gerar interfaces para todas as tabelas
Object.entries(schema).forEach(([tableName, columns]) => {
  typesCode += generateInterface(tableName, columns);
  typesCode += generateInsertType(tableName, columns);
  typesCode += generateUpdateType(tableName);
});

// Adicionar tipos de resposta da API
typesCode += `// Tipos de resposta da API
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
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
}

// Tipos para progresso de simulado
export interface SimuladoProgress {
  user_id: string;
  simulado_id: string;
  score: number;
  time_taken_minutes: number;
  answers: any;
  completed_at?: Date;
}

// Tipos para progresso de questões semanais
export interface QuestoesSemanaisProgress {
  user_id: string;
  questoes_semanais_id: string;
  score: number;
  answers: any;
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
  schedule: any;
}

// Tipos para preferências de concurso
export interface ConcursoPreferences {
  user_id: string;
  concurso_id: string;
  can_change_until: Date;
  selected_at?: Date;
  is_active?: boolean;
}

// Tipos para estatísticas de disciplina
export interface DisciplineStats {
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
  cache_data: any;
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
  disciplinas?: any;
  slug?: string;
}

// Tipos para questões de simulado
export interface SimuladoQuestion {
  simulado_id: string;
  question_number: number;
  question_text: string;
  alternatives: any;
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
  disciplinas?: any;
  slug?: string;
  created_by?: string;
}

// Tipos para conteúdo de apostila
export interface ApostilaContent {
  apostila_id: string;
  module_number: number;
  title: string;
  content_json: any;
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

// Tipos para usuários (incluindo colunas do Supabase Auth)
export interface User {
  email?: string;
  name: string;
  total_questions_answered?: number;
  total_correct_answers?: number;
  study_time_minutes?: number;
  average_score?: number;
  last_login?: Date;
  instance_id?: string;
  aud?: string;
  role?: string;
  encrypted_password?: string;
  email_confirmed_at?: Date;
  invited_at?: Date;
  confirmation_token?: string;
  confirmation_sent_at?: Date;
  recovery_token?: string;
  recovery_sent_at?: Date;
  email_change_token_new?: string;
  email_change?: string;
  email_change_sent_at?: Date;
  last_sign_in_at?: Date;
  raw_app_meta_data?: any;
  raw_user_meta_data?: any;
  is_super_admin?: boolean;
  phone?: string;
  phone_confirmed_at?: Date;
  phone_change?: string;
  phone_change_token?: string;
  phone_change_sent_at?: Date;
  confirmed_at?: Date;
  email_change_token_current?: string;
  email_change_confirm_status?: number;
  banned_until?: Date;
  reauthentication_token?: string;
  reauthentication_sent_at?: Date;
  is_sso_user?: boolean;
  deleted_at?: Date;
  is_anonymous?: boolean;
}

// Tipos para logs de auditoria
export interface AuditLog {
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
}

// Tipos para configuração de cache
export interface CacheConfig {
  cache_key: string;
  description?: string;
  ttl_minutes: number;
}
`;

// Salvar o arquivo de tipos
const typesFilePath = path.join(__dirname, '..', 'src', 'types', 'database.types.ts');
fs.writeFileSync(typesFilePath, typesCode);

console.log('✅ Tipos TypeScript atualizados com sucesso!');
console.log(`📁 Arquivo salvo em: ${typesFilePath}`);
console.log(`📊 Total de tabelas processadas: ${Object.keys(schema).length}`);

// Listar as tabelas processadas
console.log('\n📋 Tabelas processadas:');
Object.keys(schema).forEach(tableName => {
  const columnCount = Object.keys(schema[tableName]).length;
  console.log(`  - ${tableName}: ${columnCount} colunas`);
});

console.log('\n🚀 Próximos passos:');
console.log('1. Verifique se não há erros de compilação TypeScript');
console.log('2. Teste as funcionalidades críticas da aplicação');
console.log('3. Execute testes automatizados para validar as mudanças');
console.log('4. Se necessário, ajuste o código para lidar com as colunas extras do Supabase Auth'); 