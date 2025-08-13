# AprovaFácil – Backend (Express + TypeScript)

API em Node/Express com TypeScript, autenticação JWT/cookies, validação robusta de ambiente e documentação OpenAPI.

## Requisitos
- Node.js 18+
- npm

## Setup
```bash
npm install
npm run dev            # desenvolvimento com tsx (porta padrão 5000)

# produção
npm run build
npm start
```

## Scripts
```bash
# qualidade
npm run lint
npm run lint:fix
npm run typecheck
npx eslint . --ext .js,.jsx,.ts,.tsx

# testes (Vitest)
npm run test
npm run test:watch
npm run test:coverage
npm run test:ui

# preflight e contratos
npm run preflight          # valida ambiente, schema, migrações e gera relatório em logs/
npm run openapi:export     # exporta backend/openapi.json
npm run openapi:validate   # valida spec
npm run openapi:spectral   # lint da spec
npm run contracts:test     # pipeline completa da spec
```

## Variáveis de ambiente
Crie `.env` com (validadas por `src/config/environment.ts`):
```env
JWT_SECRET=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
DATABASE_URL=...
PGPASSWORD=...

PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```
O backend valida formato/tamanho, usa fallbacks para opcionais e falha em produção se inválido.

## Endpoints e documentação
- Health: `GET /api/health`
- Autenticação: `/api/auth/login|me|refresh|logout|logout-all|sessions`
- Domínios: `/api/simulados`, `/api/concursos`, `/api/estatisticas`, etc., com rotas v1 em `/api/v1/*`
- Swagger UI: `GET /api/docs` (runtime)
- Export estático: `npm run openapi:export` (gera `backend/openapi.json` – ignorado pelo Git)

### CI

No pipeline `quality-ci.yml`, o backend executa:
- `npm run typecheck`
- `npm run lint`
- `npm run test:run`
- `npm run contracts:test`

Knip (código morto):
```bash
npx knip --reporter json > knip-report-backend.json
```

### OpenAPI – Contratos (Simulados)

- Todos os contratos usam nomes idênticos ao schema do banco (snake_case). Consulte `z_sqls/schema/tables/schema_public.sql`.
- Endpoints preferenciais v1 (slug-based):
  - `GET /api/v1/simulados`
  - `GET /api/v1/simulados/{slug}`
  - `GET /api/v1/simulados/{slug}/questoes`
  - `GET /api/v1/simulados/{slug}/progresso`
  - `POST|PUT /api/v1/simulados/{slug}/progresso`
- Cabeçalhos: `ETag`, `Last-Modified`, `X-Request-Id`, `X-Server-Duration`.
- Geração e validação:
  - `npm run openapi:export` → gera `backend/openapi.json`
  - `npm run openapi:validate` → valida com `swagger-cli`
  - `npm run openapi:spectral` → lint com Spectral (`.spectral.yaml`)

## Integração com Frontend
- CORS liberado para `FRONTEND_URL` (padrão `http://localhost:3000`)
- Cookies `accessToken` e `refreshToken` são definidos pelo backend conforme expiries configuráveis
- Frontend faz proxy via `frontend/lib/api-utils.ts` e rotas em `frontend/app/api/*`

## Estrutura
```
backend/
├── src/
│   ├── api/              # rotas e handlers
│   ├── modules/          # domínios
│   ├── middleware/       # auth, versionamento, logging
│   ├── core/             # documentação (OpenAPI/Swagger), utilidades
│   ├── lib/              # logger aprimorado
│   ├── config/           # validação de ambiente, cache
│   ├── services/, repositories/, utils/
│   └── app.ts / index.ts
├── scripts/              # preflight, openapi, smoke-test, migrate
├── logs/                 # relatórios de preflight
└── vitest.config.ts
```

## Notas
- Debug no PowerShell: `$env:DEBUG="app:backend:*"; npm run dev`
- Tipos do Supabase são gerados a partir da raiz com `npm run supabase:types:backend`

## Licença
MIT