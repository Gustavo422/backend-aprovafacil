# Reestruturação e Modularização dos Domínios

## Visão Geral

Este documento descreve a migração e modularização dos domínios principais do projeto, seguindo princípios de Clean Architecture e Domain-Driven Design (DDD).

## Estrutura Antes vs Depois

### Antes
```
├── hooks/                    # Hooks misturados
│   ├── use-auth.ts
│   ├── use-toast.ts
│   ├── use-error-handler.ts
│   ├── use-mobile.tsx
│   └── use-auth-retry.ts
├── components/               # Componentes misturados
│   ├── flashcard.tsx
│   ├── auth-status.tsx
│   ├── user-nav.tsx
│   └── ui/
├── app/api/                  # Rotas com lógica direta
│   ├── simulados/
│   ├── flashcards/
│   └── auth/
└── lib/                      # Utilitários dispersos
    └── supabase.ts
```

### Depois
```
├── src/
│   ├── core/                 # Camada de infraestrutura
│   │   ├── database/
│   │   │   ├── repositories/
│   │   │   │   ├── simulados-repository.ts
│   │   │   │   └── flashcards-repository.ts
│   │   │   ├── base-repository.ts
│   │   │   └── types.ts
│   │   ├── auth/
│   │   └── utils/
│   ├── features/             # Domínios de negócio
│   │   ├── simulados/
│   │   │   ├── services/
│   │   │   │   └── simulados-service.ts
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   ├── flashcards/
│   │   │   ├── services/
│   │   │   │   └── flashcards-service.ts
│   │   │   ├── components/
│   │   │   │   └── flashcard.tsx
│   │   │   └── hooks/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   └── auth-status.tsx
│   │   │   └── hooks/
│   │   │       ├── use-auth.ts
│   │   │       └── use-auth-retry.ts
│   │   └── shared/           # Utilitários compartilhados
│   │       ├── hooks/
│   │       │   ├── use-toast.ts
│   │       │   ├── use-error-handler.ts
│   │       │   └── use-mobile.ts
│   │       └── components/
│   └── components/           # Componentes UI genéricos
│       └── ui/
├── app/api/                  # Rotas usando serviços
│   ├── simulados/
│   │   ├── route.ts          # Original
│   │   └── refactored/       # Refatorada
│   │       └── route.ts
│   └── flashcards/
└── lib/                      # Configurações
    └── supabase.ts
```

## Justificativas da Reestruturação

### 1. Separação de Responsabilidades

**Antes**: Hooks e componentes misturados em diretórios genéricos
**Depois**: Organização por domínio de negócio

**Benefícios**:
- Facilita localização de código relacionado
- Reduz acoplamento entre domínios
- Melhora manutenibilidade

### 2. Camada de Serviços

**Antes**: Lógica de negócio diretamente nas rotas de API
```typescript
// Antes - app/api/simulados/route.ts
const { data: simulados, error } = await supabase
  .from('simulados')
  .select(`
    *,
    concursos (
      id,
      nome,
      categoria,
      ano,
      banca
    )
  `)
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

**Depois**: Uso de serviços com repositórios
```typescript
// Depois - app/api/simulados/refactored/route.ts
const repository = new SimuladosRepository(supabase);
const simuladosService = new SimuladosService(repository);
const result = await simuladosService.getSimulados(1, 10);
```

**Benefícios**:
- Reutilização de lógica de negócio
- Testabilidade melhorada
- Separação clara entre camadas

### 3. Repositórios Padronizados

**Antes**: Queries SQL diretas e inconsistentes
**Depois**: Repositórios com interface padronizada

```typescript
// Exemplo: FlashcardsRepository
export class FlashcardsRepository extends BaseRepository<Flashcard, FlashcardInsert, FlashcardUpdate> {
  async findByConcurso(concursoId: string, limit?: number): Promise<Flashcard[]> {
    // Implementação padronizada
  }
  
  async saveUserProgress(progress: FlashcardProgressInsert): Promise<FlashcardProgress> {
    // Lógica de negócio encapsulada
  }
}
```

**Benefícios**:
- Interface consistente para acesso a dados
- Facilita mudanças de banco de dados
- Melhora testabilidade

### 4. Hooks Organizados por Domínio

**Antes**: Todos os hooks em `/hooks`
**Depois**: Hooks distribuídos por domínio

```
src/features/
├── auth/hooks/
│   ├── use-auth.ts          # Hook específico de auth
│   └── use-auth-retry.ts    # Hook específico de auth
├── shared/hooks/
│   ├── use-toast.ts         # Hook global
│   ├── use-error-handler.ts # Hook global
│   └── use-mobile.ts        # Hook global
└── flashcards/hooks/
    └── use-flashcards.ts    # Hook específico de flashcards
```

**Benefícios**:
- Hooks específicos de domínio ficam próximos ao código relacionado
- Hooks globais centralizados em shared
- Facilita descoberta e manutenção

### 5. Componentes Modulares

**Antes**: Componentes misturados em `/components`
**Depois**: Componentes organizados por domínio

```
src/features/
├── flashcards/components/
│   └── flashcard.tsx        # Componente específico de flashcards
├── auth/components/
│   └── auth-status.tsx      # Componente específico de auth
└── shared/components/
    └── ui/                  # Componentes UI genéricos
```

**Benefícios**:
- Componentes específicos de domínio ficam próximos à lógica relacionada
- Facilita reutilização e manutenção
- Melhora organização do código

## Exemplo de Implementação: Flashcards

### Repositório
```typescript
// src/core/database/repositories/flashcards-repository.ts
export class FlashcardsRepository extends BaseRepository<Flashcard, FlashcardInsert, FlashcardUpdate> {
  async findByConcurso(concursoId: string, limit?: number): Promise<Flashcard[]> {
    // Implementação específica para flashcards
  }
  
  async saveUserProgress(progress: FlashcardProgressInsert): Promise<FlashcardProgress> {
    // Lógica de progresso do usuário
  }
}
```

### Serviço
```typescript
// src/features/flashcards/services/flashcards-service.ts
export class FlashcardsService {
  private repository: FlashcardsRepository;

  constructor() {
    const supabase = createServerSupabaseClient();
    this.repository = new FlashcardsRepository(supabase);
  }

  async getFlashcards(page: number = 1, limit: number = 10, filters?: FlashcardFilters) {
    // Lógica de negócio encapsulada
  }
}
```

### Componente
```typescript
// src/features/flashcards/components/flashcard.tsx
export function Flashcard({ flashcard, onNext, onPrev, onRate }: FlashcardProps) {
  // Componente específico de flashcards
}
```

### Hook
```typescript
// src/features/flashcards/hooks/use-flashcards.ts
export function useFlashcards() {
  // Hook específico para gerenciar flashcards
}
```

## Benefícios da Nova Estrutura

### 1. Manutenibilidade
- Código organizado por domínio
- Fácil localização de funcionalidades
- Redução de acoplamento

### 2. Escalabilidade
- Novos domínios podem ser adicionados facilmente
- Estrutura consistente para todos os domínios
- Facilita trabalho em equipe

### 3. Testabilidade
- Serviços isolados e testáveis
- Repositórios com interface clara
- Hooks e componentes modulares

### 4. Reutilização
- Lógica de negócio centralizada em serviços
- Componentes reutilizáveis por domínio
- Hooks compartilhados quando apropriado

### 5. Performance
- Queries otimizadas nos repositórios
- Lazy loading de componentes
- Caching estratégico nos serviços

## Próximos Passos

1. **Migração Completa**: Aplicar a mesma estrutura para todos os domínios
2. **Testes**: Implementar testes unitários para serviços e repositórios
3. **Documentação**: Documentar APIs e interfaces
4. **Otimização**: Implementar caching e otimizações de performance
5. **Monitoramento**: Adicionar logs e métricas para serviços

## Conclusão

A reestruturação proposta melhora significativamente a organização, manutenibilidade e escalabilidade do código. A separação clara entre camadas e domínios facilita o desenvolvimento, teste e manutenção do sistema. 