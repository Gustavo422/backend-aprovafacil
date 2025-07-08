# Aprova Fácil - Backend

Backend moderno para a plataforma Aprova Fácil, construído com Node.js, Express e Supabase.

## 🚀 Arquitetura Atual

- **Express.js** como framework web
- **Supabase** para banco de dados e autenticação
- **Swagger UI** para documentação da API
- **Rate limiting** para proteção da API
- **Sistema de logging centralizado**
- **ESM (ES Modules)** para melhor compatibilidade e performance

## 🛠️ Configuração e Execução

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Acesso ao banco Supabase (variáveis de ambiente configuradas)

### Instalação e Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento (com hot reload)
npm run dev

# Executar testes
npm test
```

### Build e Produção

```bash
# Build para produção
npm run build

# Executar servidor de produção
npm start

# Limpar arquivos de build
npm run clean
```

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com nodemon |
| `npm run build` | Build de produção (ESM + DTS) |
| `npm start` | Executar servidor de produção |
| `npm run clean` | Limpar arquivos de build |
| `npm test` | Executar testes |

## 📊 Status do Projeto

### ✅ Concluído
- [x] Migração para ESM (ES Modules)
- [x] Bundler `tsup` configurado para build otimizado
- [x] Imports relativos padronizados com extensão `.js`
- [x] Scripts de build e limpeza para Windows e Unix
- [x] Estrutura de pastas organizada (`src/` para código, `dist/` para build)
- [x] Build testado e funcionando (190KB em ~9.5s)

### 🔄 Em Andamento
- Documentação completa da API
- Melhorias na arquitetura em camadas
- Testes automatizados

## ⚠️ Observação Importante sobre Banco de Dados

**O arquivo `schema_public.sql` na raiz do projeto é uma cópia fiel do schema real do banco de dados e deve ser referência obrigatória para qualquer alteração estrutural no backend.**

### Regras de Desenvolvimento:
1. **Antes de qualquer mudança estrutural**, consultar e manter coerência com o `schema_public.sql`
2. Qualquer sugestão de alteração de modelo, endpoint, DTO ou lógica de dados deve ser validada contra esse schema
3. Se necessário alterar o schema, atualizar o `schema_public.sql` e documentar a mudança

## 🏗️ Estrutura do Projeto

```
backend/
├── src/                    # Código fonte
│   ├── api/               # Rotas da API
│   ├── features/          # Lógica de negócio
│   ├── middleware/        # Middlewares
│   ├── types/            # Tipos TypeScript
│   └── utils/            # Utilitários
├── dist/                  # Build de produção
├── tests/                 # Testes
├── scripts/              # Scripts utilitários
└── docs/                 # Documentação
```

## 🔧 Configuração de Ambiente

Crie um arquivo `.env` na raiz do backend com as seguintes variáveis:

```env
# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico

# Servidor
PORT=5000
NODE_ENV=development

# Outras configurações
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📊 Sistema de Monitoramento

O backend inclui um sistema completo de monitoramento que funciona automaticamente:

### Dashboard Automático
```bash
npm run dev  # Inicia automaticamente o dashboard em desenvolvimento
```

### Endpoints de Monitoramento
- **Health Check:** `http://localhost:5000/api/health`
- **Health Detalhado:** `http://localhost:5000/api/health/detailed`
- **Métricas:** `http://localhost:5000/api/metrics`

### Scripts Úteis
```bash
npm run status    # Mostra endpoints de monitoramento
npm run monitor   # Inicia servidor com dashboard
```

**📖 Documentação completa:** [MONITORAMENTO.md](docs/MONITORAMENTO.md)

## 📚 Documentação da API

A documentação interativa da API está disponível em:
- **Desenvolvimento:** `http://localhost:5000/api/docs`
- **Produção:** `{seu_dominio}/api/docs`

## 🚨 Troubleshooting

### Problemas Comuns

**Build falha com erros de import:**
```bash
npm run clean
npm install
npm run build
```

**Servidor não inicia:**
- Verificar se as variáveis de ambiente estão configuradas
- Verificar se a porta 5000 está disponível
- Verificar logs de erro no console

**Problemas de banco de dados:**
- Verificar conexão com Supabase
- Validar se o schema está atualizado com `schema_public.sql`

## 📋 Próximos Passos

Todas as melhorias e tarefas planejadas estão documentadas em [todo2.md](../todo2.md)

---

**Nota:** Este backend foi otimizado para robustez, previsibilidade e fácil manutenção, com foco especial na aderência ao schema do banco de dados.