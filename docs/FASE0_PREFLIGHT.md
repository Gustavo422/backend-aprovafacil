# 🛠️ FASE 0: PRE-FLIGHT CHECK AUTOMATIZADO

## 📋 Visão Geral

A Fase 0 implementa um sistema de validação completa do ambiente antes de iniciar o backend e frontend. O objetivo é detectar e corrigir problemas **ANTES** de subir os serviços, garantindo um ambiente de desenvolvimento estável e confiável.

## 🎯 Objetivos

- ✅ Validar ambiente, schema, rotas e performance
- ✅ Detectar problemas críticos antes da inicialização
- ✅ Gerar relatórios detalhados de validação
- ✅ Automatizar verificações repetitivas
- ✅ Garantir qualidade do código e dependências

## 🚀 Como Usar

### Comando Principal
```bash
# Executar apenas o pre-flight check
npm run preflight

# Executar pre-flight + iniciar ambiente completo
npm run dev:debug

# Inicialização completa com pre-flight
npm run dev:start
```

### Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run preflight` | Executa todas as verificações da Fase 0 |
| `npm run preflight:check` | Executa verificações sem criar usuário de teste |
| `npm run dev:debug` | Pre-flight + backend + frontend |
| `npm run dev:start` | Inicialização completa com gerenciamento de processos |
| `npm run smoke-test` | Testa rotas da API de forma isolada |
| `npm run schema-validate` | Valida schema do banco de dados |

## 📊 Verificações Realizadas

### 0.1 - Validação de Variáveis de Ambiente
- ✅ Verifica presença de variáveis obrigatórias
- ✅ Valida comprimento mínimo de segredos (32+ caracteres)
- ✅ Variáveis verificadas:
  - `JWT_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
  - `DATABASE_URL`
  - `PGPASSWORD`

### 0.2 - Verificação de Versões
- ✅ Valida versão do Node.js (>= 18.0.0)
- ✅ Verifica versão do npm
- ✅ Confirma compatibilidade do ambiente

### 0.3 - Verificações de Qualidade de Código
- ✅ **ESLint** - Análise estática de código
- ✅ **TypeScript** - Verificação de tipos
- ✅ **Knip** - Detecção de arquivos mortos
- ✅ Zero warnings/erros obrigatório

### 0.4 - Validação do Schema do Banco
- ✅ Verifica tabelas essenciais
- ✅ Valida estrutura de colunas
- ✅ Confirma chaves estrangeiras
- ✅ Compara com definições de tipos

### 0.5 - Verificação de Migrações
- ✅ Detecta migrações pendentes
- ✅ Aplica migrações automaticamente
- ✅ Valida integridade do banco

### 0.6 - Criação de Usuário de Teste
- ✅ Cria usuário `test@aprovafacil.com`
- ✅ Insere na tabela `usuarios`
- ✅ Configura permissões adequadas

### 0.7 - Smoke Test das Rotas
- ✅ Testa rotas principais da API
- ✅ Verifica autenticação e permissões
- ✅ Mede tempo de resposta
- ✅ Valida status codes esperados

### 0.8 - Teste de Permissões
- ✅ Verifica controle de acesso
- ✅ Testa rotas administrativas
- ✅ Valida middleware de autenticação

### 0.9 - Headers de Segurança
- ✅ Verifica configuração CORS
- ✅ Valida headers de segurança
- ✅ Confirma configurações de produção

### 0.10 - Medição de Latência
- ✅ Testa performance das rotas
- ✅ Alerta se latência > 100ms
- ✅ Gera métricas de performance

### 0.11 - Auditoria de Segurança
- ✅ `npm audit` - Vulnerabilidades
- ✅ Verifica dependências
- ✅ Alerta sobre problemas de segurança

### 0.12 - Geração de Relatório
- ✅ Salva relatório JSON em `logs/`
- ✅ Inclui métricas e estatísticas
- ✅ Timestamp e versões do ambiente

## 📁 Estrutura de Arquivos

```
backend/
├── scripts/
│   ├── preflight.ts          # Script principal
│   ├── smoke-test.ts         # Teste de rotas
│   ├── schema-validator.ts   # Validação de schema
│   └── start-dev.ts          # Inicialização completa
├── logs/                     # Relatórios gerados
├── knip.json                 # Configuração Knip
└── package.json              # Scripts npm
```

## 🔧 Configuração

### Variáveis de Ambiente Obrigatórias
```bash
# .env
JWT_SECRET=seu_jwt_secret_muito_longo_e_seguro_aqui
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
SUPABASE_ANON_KEY=sua_anon_key_aqui
DATABASE_URL=postgresql://...
PGPASSWORD=sua_senha_postgres_aqui
```

### Configuração Knip
O arquivo `knip.json` está configurado para detectar:
- Dependências não utilizadas
- Arquivos mortos
- Exports não utilizados
- Binários não utilizados

## 📈 Relatórios

### Formato do Relatório
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "nodeVersion": "v18.0.0",
  "npmVersion": "9.0.0",
  "results": [
    {
      "task": "0.1 - Validação de variáveis de ambiente",
      "status": "success",
      "message": "Todas as variáveis estão configuradas",
      "duration": 150
    }
  ],
  "summary": {
    "total": 12,
    "success": 12,
    "error": 0,
    "warning": 0
  },
  "criticalErrors": []
}
```

### Localização dos Relatórios
- **Arquivo**: `logs/preflight-{timestamp}.json`
- **Exemplo**: `logs/preflight-1704067200000.json`

## 🚨 Tratamento de Erros

### Erros Críticos (Interrompem Execução)
- Variáveis de ambiente ausentes
- Versão do Node incompatível
- Falhas no lint/type-check
- Schema do banco inválido

### Erros Não-Críticos (Permitem Continuação)
- Usuário de teste já existe
- Avisos de performance
- Vulnerabilidades de baixo risco

### Códigos de Saída
- `0` - Sucesso completo
- `1` - Erro crítico detectado
- `2` - Erro de configuração

## 🔄 Integração com CI/CD

### GitHub Actions
```yaml
- name: Pre-flight Check
  run: |
    cd backend
    npm run preflight
```

### Docker
```dockerfile
# Executar pre-flight antes de iniciar
RUN npm run preflight
CMD ["npm", "start"]
```

## 🛠️ Troubleshooting

### Problemas Comuns

#### 1. Variáveis de Ambiente Ausentes
```bash
❌ Variáveis ausentes: JWT_SECRET, SUPABASE_URL
```
**Solução**: Configure todas as variáveis no arquivo `.env`

#### 2. Schema do Banco Inválido
```bash
❌ Tabelas essenciais ausentes: usuarios, concursos
```
**Solução**: Execute as migrações: `npm run migrate:up`

#### 3. Dependências Não Utilizadas
```bash
❌ Dependência não utilizada: lodash
```
**Solução**: Remova dependências desnecessárias ou configure no `knip.json`

#### 4. Latência Alta
```bash
⚠️ Latência alta detectada: /api/admin/estatisticas (150ms)
```
**Solução**: Otimize queries ou adicione cache

### Logs Detalhados
Para debug avançado, execute com variável de ambiente:
```bash
DEBUG=preflight:* npm run preflight
```

## 📚 Próximos Passos

### Melhorias Planejadas
- [ ] Integração com monitoramento em tempo real
- [ ] Validação de configurações de produção
- [ ] Testes de carga automatizados
- [ ] Relatórios em formato HTML
- [ ] Integração com alertas (Slack, email)

### Fases Futuras
- **Fase 1**: Otimização de Performance
- **Fase 2**: Segurança Avançada
- **Fase 3**: Monitoramento em Produção
- **Fase 4**: Automação Completa

## 🤝 Contribuição

Para contribuir com melhorias na Fase 0:

1. Crie uma branch para sua feature
2. Implemente as melhorias
3. Execute `npm run preflight` para validar
4. Abra um Pull Request

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs em `logs/`
2. Execute `npm run preflight:check` para diagnóstico
3. Consulte a documentação do projeto
4. Abra uma issue no repositório