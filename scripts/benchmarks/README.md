# Benchmarks de Performance - AprovaFácil

## Como configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do backend com o seguinte conteúdo (preencha com os dados do seu Supabase):

```

PGHOST=seu_host.supabase.co
PGPORT=5432
PGUSER=seu_usuario
PGPASSWORD=sua_senha
PGDATABASE=postgres
PGSSLMODE=require

# Variáveis para scripts de benchmark
BENCH_N=50
# BENCH_QUERY pode ser definido manualmente para benchmarks customizados
```

Você pode usar [dotenv-cli](https://www.npmjs.com/package/dotenv-cli) para rodar os scripts carregando o .env automaticamente:

```
npm install -g dotenv-cli
dotenv -e backend/.env -- node backend/scripts/benchmarks/select-simple.cjs
```

Ou exportar as variáveis manualmente no terminal antes de rodar os scripts. 