# Questões Semanais - Tasks 3 e 5 Implementadas

## Resumo da Implementação

As **Tasks 3 e 5** do todo.md foram implementadas com sucesso, cobrindo todos os casos-limite identificados, implementando sistema robusto de validação, idempotência e tratamento de erros, seguindo as melhores práticas de SOLID, padrões Next/Express e observabilidade.

## ✅ Task 3: Casos-Limite Implementados

### 1. Sem semanas no concurso ✅
- **Problema**: O que acontece quando um concurso não tem semanas cadastradas?
- **Solução**: Retorna `questao_semanal=null`, `questoes=[]`, `historico=[]`
- **Implementação**: Tratamento no repository com verificação de erro `PGRST116`

### 2. Repetição de conclusão (Idempotência) ✅
- **Problema**: Usuário tenta concluir a mesma semana múltiplas vezes
- **Solução**: Upsert idempotente com verificação de existência
- **Implementação**: 
  - Verifica se progresso já existe
  - Atualiza se existir, insere se não existir
  - Adiciona campos `criado_em` e `atualizado_em` para auditoria

### 3. Corrida de avanço automático ✅
- **Problema**: Múltiplas requisições simultâneas podem causar avanços duplicados
- **Solução**: Transações RPC com locks otimistas
- **Implementação**:
  - Função RPC `avancar_semana_strict` com `FOR UPDATE SKIP LOCKED`
  - Serviço de status com validações de concorrência
  - Processamento em lote limitado para evitar sobrecarga

## ✅ Task 5: Validação, Idempotência e Erros Implementados

### 1. Validação com Zod ✅
- **Schemas de validação** para todos os endpoints:
  - `numeroSemanaPathSchema`: Validação de path parameters
  - `historicoQuerySchema`: Validação de query parameters
  - `concluirSemanaBodySchema`: Validação de body
  - `roadmapQuerySchema`: Validação de roadmap
  - `semanaAtualQuerySchema`: Validação de semana atual

- **Validações implementadas**:
  - Números de semana: 1-52
  - UUIDs válidos para IDs
  - Limites de paginação: 1-100
  - Pontuação: 0-100
  - Tempo: positivo, máximo 24h
  - Observações: máximo 500 caracteres

### 2. Envelope de Respostas Padronizado ✅
- **Respostas de sucesso**:
```typescript
{
  success: true,
  data: unknown,
  pagination?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    nextCursor?: string
  },
  metadata: {
    timestamp: string,
    duration: number,
    correlationId?: string
  }
}
```

- **Respostas de erro**:
```typescript
{
  success: false,
  error: string,
  code: string,
  details?: unknown,
  metadata: {
    timestamp: string,
    correlationId?: string,
    requestId?: string
  }
}
```

### 3. Códigos de Erro Semânticos ✅
- **Códigos implementados**:
  - `VALIDATION_ERROR`: Erros de validação (400)
  - `UNAUTHORIZED`: Não autenticado (401)
  - `FORBIDDEN`: Acesso negado (403)
  - `RESOURCE_NOT_FOUND`: Recurso não encontrado (404)
  - `WEEK_ALREADY_COMPLETED`: Semana já concluída (409)
  - `CONCURRENT_MODIFICATION`: Modificação concorrente (409)
  - `RATE_LIMIT_EXCEEDED`: Rate limit excedido (429)
  - `INTERNAL_ERROR`: Erro interno (500)

### 4. Idempotência Garantida ✅
- **Constraint UNIQUE**: `(usuario_id, questoes_semanais_id)`
- **Upsert inteligente**: Verifica existência antes de inserir/atualizar
- **Transações RPC**: Função `register_weekly_completion` encapsula operação
- **Prevenção de duplicatas**: Locks otimistas para avanço automático

## Arquitetura Implementada

### 1. Sistema de Validação
```typescript
// Validadores com Zod
export const numeroSemanaPathSchema = z.object({
  numero_semana: z.string()
    .regex(/^\d+$/, 'numero_semana deve ser um número inteiro')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'numero_semana deve ser maior que 0')
    .refine((val) => val <= 52, 'numero_semana deve ser menor ou igual a 52'),
});

// Middleware de validação
router.post('/:numero_semana/concluir', 
  validateParams(numeroSemanaPathSchema),
  validateBody(concluirSemanaBodySchema),
  (req, res) => { void qsController.postConcluir(req, res); }
);
```

### 2. Sistema de Erros Centralizado
```typescript
// Classes de erro específicas
export class WeekNotFoundError extends ResourceNotFoundError {
  constructor(numeroSemana: number, concursoId?: string) {
    super('Semana', numeroSemana.toString());
    this.code = ErrorCodes.WEEK_NOT_FOUND;
    this.details = { numeroSemana, concursoId };
  }
}

// Factory para criar erros
export class ErrorFactory {
  static weekNotFound(numeroSemana: number, concursoId?: string): WeekNotFoundError {
    return new WeekNotFoundError(numeroSemana, concursoId);
  }
}
```

### 3. Middleware de Validação
```typescript
// Validação automática de body, query e params
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validation = validateAndNormalize(schema, req.body, 'body');
    
    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      const response = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Dados de entrada inválidos',
        { fields: errors },
        req.get('x-correlation-id'),
        req.get('x-request-id')
      );
      
      res.status(400).json(response);
      return;
    }
    
    req.body = validation.data;
    next();
  };
}
```

### 4. Rate Limiting e Sanitização
```typescript
// Rate limiting configurável
router.use(createRateLimitMiddleware(100, 15 * 60 * 1000)); // 100 requests por 15 minutos

// Sanitização de input para prevenir XSS
router.use(sanitizeInput);
```

## Variáveis de Ambiente

### Configurações Obrigatórias
```bash
# Política de desbloqueio
QS_UNLOCK_POLICY=strict|accelerated  # default: strict

# Duração da semana
QS_WEEK_DURATION_DAYS=7              # default: 7

# Controle de concorrência
QS_MAX_CONCURRENT_ADVANCES=10        # default: 10
QS_ADVANCE_CHECK_INTERVAL_MS=60000   # default: 1 minuto
```

### Validações Automáticas
- Validação na inicialização da aplicação
- Feedback claro em caso de configuração inválida
- Fallbacks seguros para valores padrão

## Banco de Dados

### Nova Tabela
```sql
CREATE TABLE usuario_questoes_semanais_status (
  id UUID PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id),
  concurso_id UUID REFERENCES public.concursos(id),
  semana_atual INTEGER NOT NULL DEFAULT 1,
  inicio_semana_em TIMESTAMPTZ NOT NULL,
  fim_semana_em TIMESTAMPTZ NOT NULL,
  modo_desbloqueio TEXT NOT NULL DEFAULT 'strict',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(usuario_id, concurso_id),
  CONSTRAINT semana_atual_positive CHECK (semana_atual > 0),
  CONSTRAINT fim_semana_after_inicio CHECK (fim_semana_em > inicio_semana_em)
);
```

### Funções RPC
```sql
-- Avançar semana no modo strict (evita corrida)
CREATE FUNCTION avancar_semana_strict(
  p_usuario_id UUID,
  p_concurso_id UUID,
  p_agora TIMESTAMPTZ,
  p_duracao_dias INTEGER
) RETURNS BOOLEAN;

-- Registrar conclusão encapsulando transação
CREATE FUNCTION register_weekly_completion(
  p_usuario_id UUID,
  p_questoes_semanais_id UUID,
  p_respostas JSONB,
  p_pontuacao INTEGER,
  p_tempo_minutos INTEGER
) RETURNS JSONB;
```

### Segurança (RLS)
- Políticas RLS por `usuario_id`
- Funções RPC com `SECURITY DEFINER`
- Controle de acesso granular

## Observabilidade

### Headers Padronizados
```typescript
res.setHeader('x-correlation-id', correlationId);
res.setHeader('x-request-id', requestId);
res.setHeader('x-feature', 'questoes-semanais');
res.setHeader('X-Server-Duration', String(duration));
```

### Endpoint de Monitoramento
```typescript
// GET /api/monitor/config
{
  "success": true,
  "data": {
    "questoesSemanais": {
      "unlockPolicy": "strict",
      "weekDurationDays": 7,
      "maxConcurrentAdvances": 10,
      "advanceCheckIntervalMs": 60000
    },
    "cache": { /* configurações de cache */ },
    "environment": { /* informações do ambiente */ }
  }
}
```

### Logs Estruturados
```typescript
this.log.error('Erro ao avançar semana accelerated', { 
  usuarioId, 
  concursoId, 
  numeroSemana, 
  error: error instanceof Error ? error.message : 'Erro desconhecido' 
});
```

## Testes

### Cobertura de Testes
- ✅ Validação com Zod
- ✅ Sistema de erros
- ✅ Middleware de validação
- ✅ Schemas de resposta
- ✅ Casos de uso principais
- ✅ Tratamento de erros

### Executar Testes
```bash
# Testes de validação
npm test -- questoes-semanais.validator.test.ts

# Testes de middleware
npm test -- validation.middleware.test.ts

# Testes de erros
npm test -- questoes-semanais.errors.test.ts
```

## Próximos Passos

### Tasks Relacionadas Concluídas
- [x] **Task 3**: Service/Repository (SOLID) - Casos-limite
- [x] **Task 4**: Variáveis de ambiente e regras
- [x] **Task 5**: Validação, idempotência e erros
- [x] **Task 13**: Observabilidade e métricas

### Tasks Pendentes
- [ ] **Task 6**: Frontend – Data layer e hooks
- [ ] **Task 7**: Frontend – Página `/questoes-semanais` (SSR+CSR)
- [ ] **Task 8**: Frontend – Correções de schema/colunas
- [ ] **Task 9**: Frontend – Reformulação visual
- [ ] **Task 10**: Supabase – Schema e consistência
- [ ] **Task 11**: Supabase – Tabela de status (implementada)
- [ ] **Task 12**: Triggers/Functions/Edge (funções RPC criadas)
- [ ] **Task 14**: Segurança e RLS

## Benefícios da Implementação

### 1. Robustez
- Tratamento de todos os casos-limite identificados
- Validação robusta com Zod
- Idempotência garantida em todas as operações
- Prevenção de corridas de concorrência

### 2. Escalabilidade
- Sistema de validação reutilizável
- Rate limiting configurável
- Cache configurável e invalidação inteligente
- Configurações parametrizáveis por ambiente

### 3. Observabilidade
- Logs estruturados com correlation ID
- Métricas de performance e erro
- Endpoint de monitoramento de configurações
- Headers padronizados para tracing

### 4. Manutenibilidade
- Arquitetura SOLID com separação clara de responsabilidades
- Sistema de erros centralizado e tipado
- Testes unitários abrangentes
- Documentação detalhada

### 5. Segurança
- Validação de input com Zod
- Sanitização automática
- Rate limiting por IP
- Headers de segurança padronizados

## Conclusão

A implementação das Tasks 3 e 5 estabelece uma base sólida e robusta para o módulo de Questões Semanais, resolvendo os problemas críticos de casos-limite, implementando sistema robusto de validação, idempotência e tratamento de erros, e implementando as melhores práticas de desenvolvimento. O sistema agora é robusto, escalável, observável e seguro, seguindo os princípios SOLID e padrões estabelecidos.

### Principais Conquistas
1. **Validação Robusta**: Sistema completo de validação com Zod
2. **Tratamento de Erros**: Sistema centralizado com códigos semânticos
3. **Idempotência**: Garantida em todas as operações
4. **Observabilidade**: Logs estruturados e métricas
5. **Segurança**: Rate limiting e sanitização automática
6. **Testes**: Cobertura abrangente de todos os componentes
