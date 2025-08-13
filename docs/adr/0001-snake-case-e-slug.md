# ADR 0001 — Snake case end-to-end e uso de slug em v1

Status: Accepted

## Contexto
O schema público no Supabase usa snake_case. Havia divergências de nomes em DTOs/validações e exposição de `id` nas rotas.

## Decisão
- Contratos JSON e tipos TS dos módulos usarão exatamente os nomes do DB (snake_case)
- Endpoints v1 expõem recursos por `slug` (identificador público)
- Campos legados seguirão aceitos temporariamente no input e marcados como `deprecated` no OpenAPI

## Consequências
- Consistência entre DB/BE/FE
- Menor ambiguidade e custo de mapeamento
- URLs estáveis para SEO e UX

## Referências
- `z_sqls/schema/tables/schema_public.sql`
- `backend/src/core/documentation/openapi.ts`

