# Arquitetura do Sistema - AprovaJá

## 1. Visão Geral

Este documento descreve a arquitetura do sistema AprovaJá, projetada para ser modular, escalável e de fácil manutenção. A arquitetura é baseada em princípios de **Domain-Driven Design (DDD)** e **Clean Architecture**, adaptados para o ecossistema Next.js com o App Router.

## 2. Princípios Arquiteturais

- **Domain-Driven Design (DDD):** A estrutura do código é organizada em torno dos domínios de negócio (ex: `simulados`, `flashcards`). Isso promove uma linguagem comum (Ubiquitous Language) e facilita a localização de funcionalidades.
- **Clean Architecture:** O sistema é dividido em camadas com responsabilidades distintas. A regra principal é que as dependências sempre apontam para dentro, da camada de Apresentação para a de Domínio, garantindo que a lógica de negócio seja independente de frameworks e UI.
- **SOLID:** Os princípios SOLID são seguidos para criar um código mais limpo e sustentável.

## 3. Estrutura de Diretórios Principal

A estrutura do projeto foi pensada para separar as responsabilidades de forma clara, utilizando as convenções do Next.js App Router.

```
.
├── app/                  # Camada de Apresentação e API (Next.js App Router)
│   ├── (dashboard)/      # Agrupamento de rotas que compartilham um layout
│   │   ├── simulados/
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx  # Página de um simulado específico
│   │   │   └── page.tsx      # Página de listagem de simulados
│   │   └── layout.tsx    # Layout compartilhado pelo dashboard
│   ├── api/              # API Routes (Application Layer)
│   │   ├── simulados/
│   │   │   └── route.ts    # Endpoint para lidar com simulados
│   └── layout.tsx        # Layout raiz da aplicação
│
├── components/           # Componentes React compartilhados e UI (ShadCN)
│   ├── ui/               # Componentes de UI primitivos (botões, cards, etc.)
│   └── flashcard.tsx     # Exemplo de componente de domínio complexo
│
├── lib/                  # Utilitários e Lógica Core da Aplicação
│   ├── supabase.ts       # Configuração dos clientes Supabase (Server, Client)
│   ├── cache.ts          # Lógica de cache (CacheManager)
│   ├── logger.ts         # Configuração do logger
│   └── repositories/     # (Legado) Repositórios - DEPRECETADO
│
├── src/                  # Lógica de Negócio e Domínio (Clean Architecture)
│   ├── core/             # Lógica central e abstrações
│   │   └── database/
│   │       ├── repositories/ # Repositórios específicos (ex: apostilas-repository.ts)
│   │       ├── types.ts      # Tipos de dados (ex: PaginatedResponse)
│   │       └── base-repository.ts # Abstração do repositório base
│   └── features/         # Lógica de negócio por domínio (Services)
│       └── simulados/
│           └── services/
│               └── simulados-service.ts
│
└── supabase/             # Configurações e Migrations do Supabase
```

**Observação sobre `lib` vs `src`:**
Atualmente, existe uma sobreposição. A direção recomendada é:
- **`lib/`**: Deve conter utilitários transversais e a configuração de serviços externos (logger, Supabase, etc.).
- **`src/`**: Deve conter a implementação da arquitetura de domínio (`core` e `features`), isolando a lógica de negócio. A pasta `lib/repositories` é um legado e deve ser removida em favor de `src/core/database/repositories`.

## 4. Camadas da Arquitetura

### Camada 1: Apresentação (View)
- **Responsabilidade:** Renderizar a UI e capturar as interações do usuário. É a camada mais externa.
- **Localização:** `app/**/page.tsx`, `app/**/layout.tsx`, `components/**/*.tsx`.
- **Características:**
    - Usa Server Components para buscar dados e Client Components (`"use client"`) para interatividade.
    - Chama as API Routes para executar ações ou os `Services` diretamente em Server Components.
    - Usa hooks (`use*`) para gerenciar estado e lógica de UI.

### Camada 2: Aplicação (API Routes / Server Actions)
- **Responsabilidade:** Orquestrar o fluxo de dados. Atua como um intermediário entre a apresentação e o domínio.
- **Localização:** `app/api/**/*.ts`.
- **Características:**
    - Recebe requisições HTTP da camada de apresentação.
    - Valida os dados de entrada (headers, body).
    - Chama os `Services` da camada de domínio para executar a lógica de negócio.
    - Formata e retorna a resposta (JSON).

### Camada 3: Domínio (Services)
- **Responsabilidade:** Conter a lógica de negócio pura e as regras de domínio. É o coração do sistema.
- **Localização:** `src/features/*/services/**/*.ts`.
- **Características:**
    - Ex: `SimuladosService` pode ter métodos como `submitSimulado` ou `calculatePerformance`.
    - Orquestra as chamadas aos `Repositories` para persistir ou buscar dados.
    - É completamente independente de UI e frameworks.

### Camada 4: Dados (Repositories)
- **Responsabilidade:** Abstrair o acesso e a persistência dos dados, isolando o resto da aplicação do Supabase.
- **Localização:** `src/core/database/repositories/`, `src/core/database/base-repository.ts`.
- **Características:**
    - Usa o padrão **Repository** para encapsular as queries.
    - `BaseRepository` fornece métodos CRUD comuns (`findById`, `create`, `update`, `delete` com soft delete).
    - Repositórios específicos (ex: `ApostilasRepository`) herdam de `BaseRepository` e implementam métodos de busca customizados.

```typescript
// Exemplo de uso em um Service
import { ApostilasRepository } from '@/src/core/database/repositories/apostilas-repository';

class ApostilasService {
  private apostilasRepository: ApostilasRepository;

  constructor(supabaseClient: SupabaseClient) {
    this.apostilasRepository = new ApostilasRepository(supabaseClient, 'apostilas');
  }

  async getApostilaById(id: string) {
    return this.apostilasRepository.findById(id);
  }
}
```

## 5. Padrões e Práticas

### Validação de Dados com Zod
A validação de dados de entrada deve ser feita na camada mais externa possível (API Routes, Server Actions) usando Zod para garantir a integridade.
- **Localização dos Schemas:** `src/core/database/validation/schemas.ts`.

### Sistema de Cache
Para otimizar a performance, um `CacheManager` é utilizado para armazenar dados frequentemente acessados.
- **Implementação:** `lib/cache.ts`.
- **Estratégia:** Usa o Supabase (tabela `user_performance_cache`) como backend de cache, com TTL (Time To Live) configurável.

### Logging Estruturado
Um logger centralizado é usado para registrar eventos importantes, erros e queries.
- **Implementação:** `lib/logger.ts`.
- **Níveis:** `ERROR`, `WARN`, `INFO`, `DEBUG`.

### Migrations e Constraints de Banco
- **Migrations:** A evolução do schema do banco de dados é gerenciada pelo sistema de migrations do Supabase, localizado na pasta `supabase/migrations/`.
- **Constraints:** Regras de integridade (ex: `CHECK`, `FOREIGN KEY`) devem ser definidas nas migrations para garantir a consistência dos dados.

```sql
-- Exemplo de Constraint em uma migration
ALTER TABLE "user_simulado_progress"
ADD CONSTRAINT "check_score"
CHECK (score >= 0 AND score <= 100);
```

## 6. Débitos Técnicos e Próximos Passos

A arquitetura atual é sólida, mas existem pontos a serem melhorados:
- **Consolidar `lib` e `src`:** Finalizar a migração da lógica de negócio para a pasta `src`, eliminando a duplicação.
- **Cobertura de Testes:** Aumentar a cobertura de testes unitários para os `Services` e `Repositories`.
- **Documentação da API:** Documentar os endpoints da API usando um padrão como OpenAPI/Swagger.
- **Segurança:** Implementar Row Level Security (RLS) de forma mais granular no Supabase para garantir que um usuário só possa acessar seus próprios dados.

Este documento deve ser mantido atualizado conforme o projeto evolui.