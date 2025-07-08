#!/usr/bin/env node

/**
 * Script para atualizar os tipos TypeScript baseado no schema do banco de dados
 * Este script gera tipos atualizados para corresponder ao schema real
 */

const fs = require('fs');
const path = require('path');

// Mapeamento de tipos SQL para TypeScript
const sqlToTsTypes = {
  'uuid': 'string',
  'character varying': 'string',
  'text': 'string',
  'integer': 'number',
  'numeric': 'number',
  'boolean': 'boolean',
  'timestamp with time zone': 'string',
  'date': 'string',
  'jsonb': 'Record<string, unknown>',
  'inet': 'string'
};

// Estruturas baseadas no schema real do banco
const schemaTypes = {
  // User DTO atualizado
  'user.dto.ts': `// DTO de User - Atualizado para corresponder ao schema real
export interface UserDTO {
  id: string;
  email: string;
  nome?: string;
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
  avatar_url?: string;
}

export interface UpdateUserDTO {
  email?: string;
  nome?: string;
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
  data_inicio: string;
  data_fim?: string;
  tempo_gasto_segundos?: number;
  respostas?: Record<string, unknown>;
  pontuacao?: number;
  acertos: number;
  erros: number;
  em_branco: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
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
  data_inicio?: string;
  tempo_gasto_segundos?: number;
  respostas?: Record<string, unknown>;
  pontuacao?: number;
  acertos?: number;
  erros?: number;
  em_branco?: number;
  is_completed?: boolean;
}

export interface UpdateUserSimuladoProgressDTO {
  data_fim?: string;
  tempo_gasto_segundos?: number;
  respostas?: Record<string, unknown>;
  pontuacao?: number;
  acertos?: number;
  erros?: number;
  em_branco?: number;
  is_completed?: boolean;
}`,

  // Questões Semanais DTO atualizado
  'questoes-semanais.dto.ts': `// DTO de Questões Semanais - Atualizado para corresponder ao schema real
export interface QuestoesSemanaDTO {
  id: string;
  titulo: string;
  descricao?: string;
  semana_numero: number;
  ano: number;
  is_active: boolean;
  data_liberacao: string;
  data_encerramento: string;
  created_at: string;
  updated_at: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface CreateQuestoesSemanaDTO {
  titulo: string;
  descricao?: string;
  semana_numero: number;
  ano: number;
  is_active?: boolean;
  data_liberacao: string;
  data_encerramento: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface UpdateQuestoesSemanaDTO {
  titulo?: string;
  descricao?: string;
  semana_numero?: number;
  ano?: number;
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
  tempo_gasto_minutos?: number;
  data_conclusao?: string;
  respostas?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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
}`,

  // Cache Config DTO
  'cache-config.dto.ts': `// DTO de Cache Config - Atualizado para corresponder ao schema real
export interface CacheConfigDTO {
  id: string;
  cache_key: string;
  ttl_minutos: number;
  descricao?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCacheConfigDTO {
  cache_key: string;
  ttl_minutos?: number;
  descricao?: string;
}

export interface UpdateCacheConfigDTO {
  cache_key?: string;
  ttl_minutos?: number;
  descricao?: string;
}`,

  // Planos Estudo DTO atualizado
  'plano-estudos.dto.ts': `// DTO de Planos de Estudo - Atualizado para corresponder ao schema real
export interface PlanoEstudoDTO {
  id: string;
  user_id: string;
  nome: string;
  descricao?: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface CreatePlanoEstudoDTO {
  user_id: string;
  nome: string;
  descricao?: string;
  is_active?: boolean;
  start_date: string;
  end_date: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface UpdatePlanoEstudoDTO {
  nome?: string;
  descricao?: string;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  concurso_id?: string;
  categoria_id?: string;
}`,

  // Mapa Assuntos DTO atualizado
  'mapa-assuntos.dto.ts': `// DTO de Mapa de Assuntos - Atualizado para corresponder ao schema real
export interface MapaAssuntoDTO {
  id: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  descricao?: string;
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
  descricao?: string;
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
  descricao?: string;
  ordem?: number;
  is_active?: boolean;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}`,

  // Flashcard DTO atualizado
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
}

export interface CreateApostilaContentDTO {
  apostila_id: string;
  module_number: number;
  title: string;
  content_json: Record<string, unknown>;
  is_active?: boolean;
  order_index?: number;
}

export interface UpdateApostilaContentDTO {
  apostila_id?: string;
  module_number?: number;
  title?: string;
  content_json?: Record<string, unknown>;
  is_active?: boolean;
  order_index?: number;
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
  console.log('🔄 Atualizando tipos TypeScript baseado no schema do banco...\n');
  
  // Atualizar cada arquivo de tipos
  Object.entries(schemaTypes).forEach(([filename, content]) => {
    updateTypeFile(filename, content);
  });
  
  console.log('\n✅ Atualização de tipos concluída!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Execute o script SQL para corrigir o banco de dados');
  console.log('2. Verifique se os tipos estão corretos');
  console.log('3. Execute os testes para garantir compatibilidade');
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { updateTypeFile, schemaTypes }; 