# Módulo `simulados`

## Objetivo
Isolar regras e contratos do domínio de simulados. Os contratos públicos usam snake_case idêntico ao banco (ver `z_sqls/schema/tables/schema_public.sql`). Identificador público é `slug`.

## Onde tocar
- `controllers/` – orquestração HTTP (headers, envelopes, códigos)
- `services/` – regras de domínio, agregações, cache
- `repositories/` – acesso ao Supabase, selects explícitos (sem `*`)
- `dtos/` – DTOs públicos em snake_case
- `mappers/` – tolerância a colunas novas, saneamento

## Contratos (OpenAPI)
- Exportados a partir de `backend/src/core/documentation/openapi.ts`
- Endpoints v1:
  - `GET /api/v1/simulados`
  - `GET /api/v1/simulados/{slug}`
  - `GET /api/v1/simulados/{slug}/questoes`
  - `GET|POST|PUT /api/v1/simulados/{slug}/progresso`
- Headers: `ETag`, `Last-Modified`, `X-Request-Id`, `X-Server-Duration`

## Evolução do schema (guia rápido)
1. Criar migration no Supabase com defaults seguros, índices e RLS
2. Atualizar selects no repositório (colunas explícitas)
3. Atualizar DTOs/mappers (snake_case)
4. Atualizar OpenAPI e marcar aliases antigos como `deprecated`, se necessário
5. Rodar: `npm run openapi:export && npm run openapi:validate && npm run openapi:spectral`

## Cache e ETags
- ETag por lista, detalhe (meta) e questões
- `Last-Modified` alinhado a `simulados.atualizado_em` e `questoes_atualizado_em`

## Boas práticas
- Não usar `select('*')`
- Validar entrada com Zod nas rotas
- Evitar vazar `id` (usar `slug` em v1)

