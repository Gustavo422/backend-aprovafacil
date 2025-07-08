#!/usr/bin/env node

/**
 * Script para atualizar os tipos TypeScript baseado no schema real do banco
 * Versão 2 - Corrigida para corresponder ao schema atual
 */

const fs = require('fs');
const path = require('path');

// Estruturas baseadas no schema real do banco
const schemaTypes = {
  // Simulados Personalizados DTO
  'simulados-personalizados.dto.ts': `// DTO de Simulados Personalizados - Baseado no schema real
export interface SimuladoPersonalizadoDTO {
  id: string;
  user_id: string;
  titulo: string;
  descricao?: string;
  configuracoes?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Colunas adicionais que podem ser adicionadas
  title?: string;
  description?: string;
  questions_count?: number;
  time_minutes?: number;
  difficulty?: string;
  deleted_at?: string;
  concurso_id?: string;
  is_public?: boolean;
  created_by?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
}

export interface CreateSimuladoPersonalizadoDTO {
  user_id: string;
  titulo: string;
  descricao?: string;
  configuracoes?: Record<string, unknown>;
  title?: string;
  description?: string;
  questions_count?: number;
  time_minutes?: number;
  difficulty?: string;
  concurso_id?: string;
  is_public?: boolean;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
}

export interface UpdateSimuladoPersonalizadoDTO {
  titulo?: string;
  descricao?: string;
  configuracoes?: Record<string, unknown>;
  title?: string;
  description?: string;
  questions_count?: number;
  time_minutes?: number;
  difficulty?: string;
  deleted_at?: string;
  concurso_id?: string;
  is_public?: boolean;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
}`,

  // Apostila Inteligente DTO
  'apostila-inteligente.dto.ts': `// DTO de Apostila Inteligente - Baseado no schema real
export interface ApostilaInteligenteDTO {
  id: string;
  titulo: string;
  descricao?: string;
  conteudo: Record<string, unknown>;
  concurso_id?: string;
  categoria_id?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  // Colunas adicionais que podem ser adicionadas
  title?: string;
  description?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
  created_by?: string;
}

export interface CreateApostilaInteligenteDTO {
  titulo: string;
  descricao?: string;
  conteudo: Record<string, unknown>;
  concurso_id?: string;
  categoria_id?: string;
  is_active?: boolean;
  title?: string;
  description?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
  created_by?: string;
}

export interface UpdateApostilaInteligenteDTO {
  titulo?: string;
  descricao?: string;
  conteudo?: Record<string, unknown>;
  concurso_id?: string;
  categoria_id?: string;
  is_active?: boolean;
  title?: string;
  description?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
  created_by?: string;
}`,

  // Cache Config DTO atualizado
  'cache-config.dto.ts': `// DTO de Cache Config - Atualizado para corresponder ao schema real
export interface CacheConfigDTO {
  id: string;
  cache_key: string;
  ttl_minutes: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCacheConfigDTO {
  cache_key: string;
  ttl_minutes?: number;
  description?: string;
}

export interface UpdateCacheConfigDTO {
  cache_key?: string;
  ttl_minutes?: number;
  description?: string;
}`,

  // Mapa Assuntos DTO atualizado
  'mapa-assuntos.dto.ts': `// DTO de Mapa de Assuntos - Atualizado para corresponder ao schema real
export interface MapaAssuntoDTO {
  id: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  description?: string;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

export interface CreateMapaAssuntoDTO {
  disciplina: string;
  tema: string;
  subtema?: string;
  description?: string;
  ordem?: number;
  is_active?: boolean;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

export interface UpdateMapaAssuntoDTO {
  disciplina?: string;
  tema?: string;
  subtema?: string;
  description?: string;
  ordem?: number;
  is_active?: boolean;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}`,

  // Questões Semanais DTO atualizado
  'questoes-semanais.dto.ts': `// DTO de Questões Semanais - Atualizado para corresponder ao schema real
export interface QuestoesSemanaDTO {
  id: string;
  titulo?: string;
  title?: string;
  descricao?: string;
  description?: string;
  semana_numero?: number;
  week_number?: number;
  ano?: number;
  year?: number;
  is_active: boolean;
  data_liberacao: string;
  data_encerramento: string;
  created_at: string;
  updated_at: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface CreateQuestoesSemanaDTO {
  titulo?: string;
  title?: string;
  descricao?: string;
  description?: string;
  semana_numero?: number;
  week_number?: number;
  ano?: number;
  year?: number;
  is_active?: boolean;
  data_liberacao: string;
  data_encerramento: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface UpdateQuestoesSemanaDTO {
  titulo?: string;
  title?: string;
  descricao?: string;
  description?: string;
  semana_numero?: number;
  week_number?: number;
  ano?: number;
  year?: number;
  is_active?: boolean;
  data_liberacao?: string;
  data_encerramento?: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface UserQuestoesSemanaProgressDTO {
  id: string;
  user_id: string;
  questoes_semanais_id: string;
  score: number;
  respostas_corretas: number;
  total_questoes: number;
  time_taken_minutes?: number;
  data_conclusao?: string;
  completed_at?: string;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}`,

  // User Simulado Progress DTO atualizado
  'user-simulado-progress.dto.ts': `// DTO de Progresso de Simulado do Usuário - Atualizado para corresponder ao schema real
export interface UserSimuladoProgressDTO {
  id: string;
  user_id: string;
  simulado_id: string;
  start_time: string;
  end_time?: string;
  time_taken_seconds?: number;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  pontuacao?: number;
  score?: number;
  acertos: number;
  erros: number;
  em_branco: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  time_taken_minutes?: number;
  completed_at?: string;
}

export interface CreateUserSimuladoProgressDTO {
  user_id: string;
  simulado_id: string;
  start_time?: string;
  end_time?: string;
  time_taken_seconds?: number;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  pontuacao?: number;
  score?: number;
  acertos?: number;
  erros?: number;
  em_branco?: number;
  is_completed?: boolean;
  time_taken_minutes?: number;
  completed_at?: string;
}

export interface UpdateUserSimuladoProgressDTO {
  end_time?: string;
  time_taken_seconds?: number;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  pontuacao?: number;
  score?: number;
  acertos?: number;
  erros?: number;
  em_branco?: number;
  is_completed?: boolean;
  time_taken_minutes?: number;
  completed_at?: string;
}`,

  // Planos Estudo DTO atualizado
  'plano-estudos.dto.ts': `// DTO de Planos de Estudo - Atualizado para corresponder ao schema real
export interface PlanoEstudoDTO {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  concurso_id?: string;
  categoria_id?: string;
  schedule?: Record<string, unknown>;
}

export interface CreatePlanoEstudoDTO {
  user_id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  start_date: string;
  end_date: string;
  concurso_id?: string;
  categoria_id?: string;
  schedule?: Record<string, unknown>;
}

export interface UpdatePlanoEstudoDTO {
  name?: string;
  description?: string;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  concurso_id?: string;
  categoria_id?: string;
  schedule?: Record<string, unknown>;
}`,

  // User DTO atualizado
  'user.dto.ts': `// DTO de User - Atualizado para corresponder ao schema real
export interface UserDTO {
  id: string;
  email: string;
  nome?: string;
  name?: string;
  created_at: string;
  updated_at: string;
  total_questions_answered: number;
  total_correct_answers: number;
  study_time_minutes: number;
  average_score: number;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
}

export interface CreateUserDTO {
  email: string;
  nome?: string;
  name?: string;
  avatar_url?: string;
}

export interface UpdateUserDTO {
  email?: string;
  nome?: string;
  name?: string;
  avatar_url?: string;
  is_active?: boolean;
}`,

  // Simulados DTO atualizado
  'simulados.dto.ts': `// DTO de Simulados - Atualizado para corresponder ao schema real
export interface SimuladoDTO {
  id: string;
  titulo: string;
  descricao?: string;
  num_questoes: number;
  tempo_minutos: number;
  dificuldade: string;
  is_public: boolean;
  is_active: boolean;
  data_inicio?: string;
  data_fim?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
}

export interface CreateSimuladoDTO {
  titulo: string;
  descricao?: string;
  num_questoes?: number;
  tempo_minutos?: number;
  dificuldade?: string;
  is_public?: boolean;
  is_active?: boolean;
  data_inicio?: string;
  data_fim?: string;
  created_by?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
}

export interface UpdateSimuladoDTO {
  titulo?: string;
  descricao?: string;
  num_questoes?: number;
  tempo_minutos?: number;
  dificuldade?: string;
  is_public?: boolean;
  is_active?: boolean;
  data_inicio?: string;
  data_fim?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
}

// DTO para resposta de simulado com relacionamentos
export interface SimuladoWithRelationsDTO extends SimuladoDTO {
  concurso_categorias?: {
    id: string;
    nome: string;
    slug: string;
    descricao?: string;
    cor_primaria: string;
    cor_secundaria: string;
  };
  concursos?: {
    id: string;
    nome: string;
    descricao?: string;
    ano?: number;
    banca?: string;
  };
  simulado_questoes?: SimuladoQuestaoDTO[];
}

// DTO para questão de simulado
export interface SimuladoQuestaoDTO {
  id: string;
  simulado_id: string;
  enunciado: string;
  alternativas: Record<string, unknown>;
  resposta_correta: string;
  explicacao?: string;
  disciplina?: string;
  assunto?: string;
  dificuldade: string;
  ordem: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

// DTO para progresso do usuário com simulados
export interface UserSimuladoProgressDTO {
  id: string;
  user_id: string;
  simulado_id: string;
  start_time: string;
  end_time?: string;
  time_taken_seconds?: number;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  pontuacao?: number;
  score?: number;
  acertos: number;
  erros: number;
  em_branco: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  time_taken_minutes?: number;
  completed_at?: string;
}

// DTOs adicionais para compatibilidade
export interface CreateSimuladoQuestaoDTO {
  simulado_id: string;
  enunciado: string;
  alternativas: Record<string, unknown>;
  resposta_correta: string;
  explicacao?: string;
  disciplina?: string;
  assunto?: string;
  dificuldade?: string;
  ordem?: number;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

export interface UpdateSimuladoQuestaoDTO {
  enunciado?: string;
  alternativas?: Record<string, unknown>;
  resposta_correta?: string;
  explicacao?: string;
  disciplina?: string;
  assunto?: string;
  dificuldade?: string;
  ordem?: number;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

export interface CreateUserSimuladoProgressDTO {
  user_id: string;
  simulado_id: string;
  start_time?: string;
  time_taken_seconds?: number;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  pontuacao?: number;
  score?: number;
  acertos?: number;
  erros?: number;
  em_branco?: number;
  is_completed?: boolean;
  time_taken_minutes?: number;
  completed_at?: string;
}

export interface UpdateUserSimuladoProgressDTO {
  end_time?: string;
  time_taken_seconds?: number;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  pontuacao?: number;
  score?: number;
  acertos?: number;
  erros?: number;
  em_branco?: number;
  is_completed?: boolean;
  time_taken_minutes?: number;
  completed_at?: string;
}

// DTO para filtros de busca
export interface SimuladoFiltersDTO {
  concurso_id?: string;
  categoria_id?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// DTO para resposta paginada
export interface PaginatedSimuladosResponseDTO {
  success: boolean;
  data: SimuladoWithRelationsDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// DTO para resposta de simulado com questões
export interface SimuladoWithQuestoesDTO extends SimuladoWithRelationsDTO {
  questoes: SimuladoQuestaoDTO[];
}

// DTOs adicionais para compatibilidade com código existente
export interface CreateSimuladoDto {
  titulo: string;
  descricao?: string;
  concurso_id: string;
  categoria_disciplina_id: string;
  tempo_limite?: number; // em minutos
  total_questoes?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateSimuladoDto {
  id: string;
  titulo?: string;
  descricao?: string;
  concurso_id?: string;
  categoria_disciplina_id?: string;
  tempo_limite?: number;
  total_questoes?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SimuladoFiltersDto {
  concurso_id?: string;
  categoria_disciplina_id?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: 'titulo' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface SimuladoIdDto {
  id: string;
}

export interface CreateSimuladoQuestaoDto {
  simulado_id: string;
  questao_id: string;
  ordem?: number;
  pontos?: number;
}

export interface UpdateSimuladoQuestaoDto {
  id: string;
  simulado_id?: string;
  questao_id?: string;
  ordem?: number;
  pontos?: number;
}

export interface SimuladoQuestaoIdDto {
  id: string;
}

export interface SimuladoResponseDto {
  id: string;
  titulo: string;
  descricao?: string;
  concurso_id: string;
  categoria_disciplina_id: string;
  tempo_limite?: number;
  total_questoes?: number;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  concurso_categorias?: {
    id: string;
    nome: string;
    slug: string;
    descricao?: string;
    cor_primaria?: string;
    cor_secundaria?: string;
  };
  concursos?: {
    id: string;
    nome: string;
    descricao?: string;
    ano: number;
    banca: string;
  };
}

export interface SimuladoQuestaoResponseDto {
  id: string;
  simulado_id: string;
  questao_id: string;
  ordem: number;
  pontos: number;
  created_at: string;
  updated_at: string;
  questoes?: {
    id: string;
    enunciado: string;
    alternativas: string[];
    resposta_correta: number;
    explicacao?: string;
    nivel_dificuldade?: 'facil' | 'medio' | 'dificil';
  };
}`,

  // Apostilas DTO atualizado
  'apostilas.dto.ts': `// DTO de Apostilas - Atualizado para corresponder ao schema real
export interface ApostilaDTO {
  id: string;
  title: string;
  description?: string;
  concurso_id?: string;
  created_at: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  is_active: boolean;
  updated_at: string;
}

export interface CreateApostilaDTO {
  title: string;
  description?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdateApostilaDTO {
  title?: string;
  description?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  is_active?: boolean;
}

export interface ApostilaContentDTO {
  id: string;
  apostila_id: string;
  module_number: number;
  title: string;
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  order_index: number;
  concurso_id?: string;
}

export interface CreateApostilaContentDTO {
  apostila_id: string;
  module_number: number;
  title: string;
  content_json: Record<string, unknown>;
  is_active?: boolean;
  order_index?: number;
  concurso_id?: string;
}

export interface UpdateApostilaContentDTO {
  apostila_id?: string;
  module_number?: number;
  title?: string;
  content_json?: Record<string, unknown>;
  is_active?: boolean;
  order_index?: number;
  concurso_id?: string;
}

export interface UserApostilaProgressDTO {
  id: string;
  user_id: string;
  apostila_content_id: string;
  completed: boolean;
  progress_percentage: number;
  last_accessed: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserApostilaProgressDTO {
  user_id: string;
  apostila_content_id: string;
  completed?: boolean;
  progress_percentage?: number;
  last_accessed?: string;
}

export interface UpdateUserApostilaProgressDTO {
  completed?: boolean;
  progress_percentage?: number;
  last_accessed?: string;
}`,

  // Flashcards DTO atualizado
  'flashcards.dto.ts': `// DTO de Flashcards - Atualizado para corresponder ao schema real
export interface FlashcardDTO {
  id: string;
  front: string;
  back: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  created_at: string;
  updated_at: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  is_active: boolean;
}

export interface CreateFlashcardDTO {
  front: string;
  back: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  is_active?: boolean;
}

export interface UpdateFlashcardDTO {
  front?: string;
  back?: string;
  disciplina?: string;
  tema?: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  is_active?: boolean;
}

export interface UserFlashcardProgressDTO {
  id: string;
  user_id: string;
  flashcard_id: string;
  status: string;
  next_review?: string;
  review_count: number;
  ease_factor: number;
  interval_days: number;
  last_reviewed?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserFlashcardProgressDTO {
  user_id: string;
  flashcard_id: string;
  status?: string;
  next_review?: string;
  review_count?: number;
  ease_factor?: number;
  interval_days?: number;
  last_reviewed?: string;
}

export interface UpdateUserFlashcardProgressDTO {
  status?: string;
  next_review?: string;
  review_count?: number;
  ease_factor?: number;
  interval_days?: number;
  last_reviewed?: string;
}`,

  // Audit Log DTO
  'audit-log.dto.ts': `// DTO de Audit Log - Atualizado para corresponder ao schema real
export interface AuditLogDTO {
  id: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CreateAuditLogDTO {
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface UpdateAuditLogDTO {
  user_id?: string;
  action?: string;
  table_name?: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}`
};

// Função para atualizar um arquivo de tipos
function updateTypeFile(filename, content) {
  const typesDir = path.join(__dirname, '..', 'src', 'types');
  const filePath = path.join(typesDir, filename);
  
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Atualizado: ${filename}`);
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${filename}:`, error.message);
  }
}

// Função principal
function main() {
  console.log('🔄 Atualizando tipos TypeScript baseado no schema real do banco...\n');
  
  // Atualizar cada arquivo de tipos
  Object.entries(schemaTypes).forEach(([filename, content]) => {
    updateTypeFile(filename, content);
  });
  
  console.log('\n✅ Atualização de tipos concluída!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Execute o script SQL para corrigir as colunas faltantes');
  console.log('2. Verifique se os tipos estão corretos');
  console.log('3. Execute os testes para garantir compatibilidade');
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { updateTypeFile, schemaTypes }; 