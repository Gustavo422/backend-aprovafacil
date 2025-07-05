# Análise de Consistência: Banco de Dados vs Código

## Visão Geral

Este documento analisa a consistência entre as estruturas do banco de dados e as implementações no código, identificando possíveis divergências e propondo melhorias.

## Estrutura do Banco de Dados

### Tabelas Identificadas

1. **simulados**
   - id (uuid, primary key)
   - titulo (text)
   - descricao (text)
   - concurso_id (uuid, foreign key)
   - is_public (boolean)
   - created_by (uuid, foreign key)
   - created_at (timestamp)
   - updated_at (timestamp)
   - deleted_at (timestamp, nullable)

2. **simulado_questions**
   - id (uuid, primary key)
   - simulado_id (uuid, foreign key)
   - question_number (integer)
   - question_text (text)
   - alternatives (jsonb)
   - correct_answer (text)
   - explanation (text)
   - discipline (text)
   - topic (text)
   - difficulty (text)
   - created_at (timestamp)
   - updated_at (timestamp)

3. **user_simulado_progress**
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - simulado_id (uuid, foreign key)
   - score (numeric)
   - time_taken_minutes (integer)
   - completed_at (timestamp)
   - created_at (timestamp)
   - updated_at (timestamp)

4. **flashcards**
   - id (uuid, primary key)
   - pergunta (text)
   - resposta (text)
   - explicacao (text, nullable)
   - materia (text)
   - assunto (text)
   - nivel_dificuldade (text)
   - concurso_id (uuid, foreign key)
   - created_at (timestamp)
   - updated_at (timestamp)

5. **flashcard_progress**
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - flashcard_id (uuid, foreign key)
   - acertou (boolean)
   - tempo_resposta (integer, nullable)
   - tentativas (integer)
   - ultima_revisao (timestamp, nullable)
   - proxima_revisao (timestamp, nullable)
   - created_at (timestamp)
   - updated_at (timestamp)

6. **concursos**
   - id (uuid, primary key)
   - nome (text)
   - categoria (text)
   - ano (integer)
   - banca (text)
   - created_at (timestamp)
   - updated_at (timestamp)

## Análise de Consistência

### ✅ Consistências Identificadas

#### 1. Simulados
- **Tabela**: `simulados` ✅
- **Repository**: `SimuladosRepository` ✅
- **Service**: `SimuladosService` ✅
- **Types**: Definidos em `types.ts` ✅

**Campos Mapeados**:
- `id` → `id: string`
- `titulo` → `titulo: string`
- `descricao` → `descricao: string`
- `concurso_id` → `concurso_id: string`
- `is_public` → `is_public: boolean`
- `created_by` → `created_by: string`
- `created_at` → `created_at: string`
- `updated_at` → `updated_at: string`
- `deleted_at` → `deleted_at: string | null`

#### 2. Flashcards
- **Tabela**: `flashcards` ✅
- **Repository**: `FlashcardsRepository` ✅
- **Service**: `FlashcardsService` ✅
- **Types**: Definidos no repository ✅

**Campos Mapeados**:
- `id` → `id: string`
- `pergunta` → `pergunta: string`
- `resposta` → `resposta: string`
- `explicacao` → `explicacao?: string`
- `materia` → `materia: string`
- `assunto` → `assunto: string`
- `nivel_dificuldade` → `nivel_dificuldade: 'facil' | 'medio' | 'dificil'`
- `concurso_id` → `concurso_id: string`
- `created_at` → `created_at: string`
- `updated_at` → `updated_at: string`

### ⚠️ Divergências Identificadas

#### 1. Tipos de Dados
- **Banco**: `nivel_dificuldade` como `text`
- **Código**: `nivel_dificuldade` como union type `'facil' | 'medio' | 'dificil'`
- **Status**: ✅ Consistente (validação no código)

#### 2. Campos Opcionais
- **Banco**: `explicacao` como `nullable`
- **Código**: `explicacao?: string`
- **Status**: ✅ Consistente

#### 3. Relacionamentos
- **Banco**: Foreign keys definidas
- **Código**: Tipos de relacionamento implementados
- **Status**: ✅ Consistente

### 🔍 Áreas de Melhoria

#### 1. Validação de Dados
```typescript
// Implementar validação no nível do repositório
export class FlashcardsRepository extends BaseRepository<Flashcard, FlashcardInsert, FlashcardUpdate> {
  private validateNivelDificuldade(nivel: string): nivel is 'facil' | 'medio' | 'dificil' {
    return ['facil', 'medio', 'dificil'].includes(nivel);
  }

  async createFlashcard(data: FlashcardInsert): Promise<Flashcard> {
    if (!this.validateNivelDificuldade(data.nivel_dificuldade)) {
      throw new Error('Nível de dificuldade inválido');
    }
    // ... resto da implementação
  }
}
```

#### 2. Constraints de Banco
```sql
-- Adicionar constraints para garantir consistência
ALTER TABLE flashcards 
ADD CONSTRAINT check_nivel_dificuldade 
CHECK (nivel_dificuldade IN ('facil', 'medio', 'dificil'));

ALTER TABLE flashcard_progress 
ADD CONSTRAINT check_tentativas 
CHECK (tentativas >= 0);

ALTER TABLE user_simulado_progress 
ADD CONSTRAINT check_score 
CHECK (score >= 0 AND score <= 100);
```

#### 3. Índices de Performance
```sql
-- Índices para otimizar consultas frequentes
CREATE INDEX idx_flashcards_concurso_id ON flashcards(concurso_id);
CREATE INDEX idx_flashcards_materia ON flashcards(materia);
CREATE INDEX idx_flashcard_progress_user_id ON flashcard_progress(user_id);
CREATE INDEX idx_simulados_concurso_id ON simulados(concurso_id);
CREATE INDEX idx_simulados_created_by ON simulados(created_by);
```

## Recomendações

### 1. Implementar Migrations
```typescript
// src/core/database/migrations/
export class CreateFlashcardsTable {
  async up() {
    // Implementar criação da tabela
  }
  
  async down() {
    // Implementar rollback
  }
}
```

### 2. Adicionar Validação de Schema
```typescript
// src/core/database/validation/
export const flashcardSchema = z.object({
  pergunta: z.string().min(1),
  resposta: z.string().min(1),
  explicacao: z.string().optional(),
  materia: z.string().min(1),
  assunto: z.string().min(1),
  nivel_dificuldade: z.enum(['facil', 'medio', 'dificil']),
  concurso_id: z.string().uuid(),
});
```

### 3. Implementar Soft Delete Consistente
```typescript
// Garantir que todas as tabelas tenham deleted_at
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
```

### 4. Adicionar Auditoria
```sql
-- Tabela de auditoria para mudanças importantes
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Conclusão

A análise mostra que a estrutura atual está **majoritariamente consistente** entre banco de dados e código. As principais áreas de melhoria são:

1. **Validação**: Implementar validação mais rigorosa no nível do repositório
2. **Constraints**: Adicionar constraints de banco para garantir integridade
3. **Performance**: Implementar índices para consultas frequentes
4. **Auditoria**: Adicionar sistema de auditoria para mudanças importantes
5. **Migrations**: Implementar sistema de migrations para controle de versão do banco

A arquitetura proposta com repositórios e serviços facilita a manutenção dessa consistência e permite evolução controlada do sistema. 