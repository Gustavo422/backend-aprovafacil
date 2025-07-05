# Nova Arquitetura - Study App

## 🏗️ Estrutura Baseada em Domínios (DDD)

### 📁 Organização por Features

```
src/
├── features/           # Módulos de domínio
│   ├── auth/          # Autenticação
│   ├── simulados/     # Simulados e questões
│   ├── flashcards/    # Flashcards
│   ├── apostilas/     # Apostilas e conteúdo
│   ├── dashboard/     # Dashboard e estatísticas
│   ├── concursos/     # Concursos
│   └── shared/        # Componentes e utilitários compartilhados
├── core/              # Camada de infraestrutura
│   ├── database/      # Repositórios e acesso a dados
│   ├── auth/          # Configuração de autenticação
│   └── utils/         # Utilitários globais
└── app/               # Next.js App Router
```

### 🎯 Princípios Aplicados

1. **Separation of Concerns**: Cada módulo tem responsabilidade única
2. **Repository Pattern**: Abstração do acesso ao Supabase
3. **Domain-Driven Design**: Organização por contexto de negócio
4. **SOLID Principles**: Interfaces bem definidas e baixo acoplamento
5. **DRY**: Eliminação de código duplicado

### 🔄 Fluxo de Dados

```
UI Components → Custom Hooks → Services → Repositories → Supabase
```

### 📦 Módulos

#### `features/auth/`
- Autenticação e autorização
- Gerenciamento de sessão
- Middleware de proteção

#### `features/simulados/`
- CRUD de simulados
- Sistema de questões
- Progresso do usuário
- Estatísticas de performance

#### `features/flashcards/`
- Sistema de flashcards
- Algoritmo de repetição espaçada
- Progresso de revisão

#### `features/apostilas/`
- Gerenciamento de apostilas
- Conteúdo modular
- Progresso de leitura

#### `features/dashboard/`
- Estatísticas consolidadas
- Atividades recentes
- Métricas de performance

#### `core/database/`
- Repositórios para cada entidade
- Queries otimizadas
- Cache e performance 