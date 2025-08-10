# Módulo Guru (Backend)

Este módulo implementa a boundary da sessão "Guru da Aprovação" no backend.

## Estrutura
- `controllers/` controladores finos (validação, orquestração)
- `services/` regras de domínio e agregação
- `repositories/` acesso ao Supabase (seleções explícitas e mappers)
- `dtos/` contratos estáveis com o frontend
- `mappers/` conversão de entidades → DTOs

## Endpoints (aliases estáveis)
- `GET /api/guru/v1/dashboard/enhanced-stats`
- `GET /api/guru/v1/dashboard/activities`

Ambos apontam para os handlers do módulo e mantêm compatibilidade com caminhos legados.

## Contratos
Respostas padronizadas: `{ success: true, data } | { success: false, error, code }`.
Propagação de `x-correlation-id` do frontend para logs/métricas.

## Supabase
- Repositórios consultam views públicas: `v_guru_*` (que podem ler de MVs `mv_guru_*`).
- RLS via `usuario_id = auth.uid()` nas views.
- Índices nas MVs para filtros/ordens críticas.

## Cache
- Cache por usuário (e concurso quando aplicável) com TTL: stats (5 min), activities (2 min).
- Chaves: `guru:enhanced-stats:user:{usuarioId}[:concurso:{concursoId}]`, `guru:activities:user:{usuarioId}[:concurso:{concursoId}]:limit:{n}`.

## Evolução de schema (guia rápido)
1) Criar migration com defaults/índices/RLS (via Supabase migrations). Evitar `NULL` sem defaults em produção.
2) Ajustar views/MVs (`v_guru_*` e `mv_guru_*`) se necessário (preferir trocar a view para apontar para a MV após `REFRESH` completo).
3) Atualizar repositórios com seleção explícita de colunas e mapear para DTO (campos novos inicialmente opcionais para não quebrar o frontend).
4) Atualizar OpenAPI e versionamento dos endpoints caso haja breaking change (ex.: `v1` → `v2`).
5) Atualizar hooks/contratos no frontend (`frontend/src/features/guru/api/contracts.ts`).
6) Rodar testes (unit/integration/e2e) e o smoke test (`npm --prefix backend run smoke-test`).

## Pontos de extensão
- Novos agregados: criar view/MV dedicada e método no repositório/serviço.
- Observabilidade: padronizar logs (requestId, userId, feature=guru, durationMs).

## Observabilidade mínima
- CorrelationId propagado via header `x-correlation-id` do frontend para backend.
- Middleware de request logging adiciona `x-request-id` e mede `responseTime`.
- `LogService` registra performance das operações do módulo (`guru.enhanced-stats`, `guru.activities`).

## Rollout com Feature Flag
- Variáveis (backend):
  - `GURU_NEW_MODULE_FLAG`: `off` | `canary` | `on` (default: `on`)
  - `GURU_NEW_MODULE_CANARY_PERCENT`: 0–100 (default: 0)
- Middleware: `guru-feature-flag.middleware` marca `req.guruRouteTarget` (`new`|`legacy`) para futura lógica de bifurcação se necessário.
- Frontend: `NEXT_PUBLIC_GURU_NEW_MODULE_FLAG` e `NEXT_PUBLIC_GURU_NEW_MODULE_CANARY_PERCENT` definem os endpoints consumidos pelo gateway (`/api/guru/v1/...` vs legacy), mantendo compatibilidade.