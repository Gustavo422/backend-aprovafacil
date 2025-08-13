# Mapeamento ID → slug (Simulados)

> Uso temporário para migração de URLs. A fonte de verdade é a tabela `simulados` (coluna `slug`).

| id (uuid) | slug |
|---|---|
| ... | ... |

Notas:
- Para rotas legadas `[id]`, configurar redirects 302 para `/simulados/[slug]`
- Backend: manter `GET /api/simulados/:id` com headers `Deprecation`/`Sunset` apontando para `/api/v1/simulados/:slug`

