# 🚀 Central de Monitoramento AprovaFácil

Sistema avançado de monitoramento em tempo real para o backend do AprovaFácil, fornecendo visibilidade completa sobre o estado da aplicação, performance e saúde do sistema.

## ✨ Funcionalidades

### 📊 Dashboard Web Moderno
- **Interface responsiva** com design inspirado no frontend
- **Cards informativos** com status em tempo real
- **Gráficos interativos** de CPU, memória e logs
- **Atualização automática** a cada 30 segundos
- **Dark mode** nativo

### 🔍 Monitoramento de Sistema
- **CPU**: Uso, cores disponíveis, load average
- **Memória**: Total, usado, livre, porcentagem de uso
- **Uptime**: Tempo de funcionamento do servidor
- **Plataforma**: Informações do sistema operacional
- **Alertas**: Warnings automáticos para uso alto de recursos

### 🗄️ Status do Banco de Dados
- **Conexão**: Teste de conectividade em tempo real
- **Performance**: Tempo de resposta das queries
- **Tabelas**: Contagem e listagem de tabelas disponíveis
- **Pool de conexões**: Status das conexões ativas
- **Alertas**: Detecção de lentidão ou falhas

### 🧪 Integração com Testes
- **Descoberta automática** de arquivos de teste
- **Execução via interface** com botão dedicado
- **Parseamento de resultados** do Vitest
- **Cobertura de código** (quando disponível)
- **Histórico de execuções**

### 📝 Sistema de Logs
- **Descoberta automática** de arquivos de log
- **Parseamento inteligente** (JSON e formato comum)
- **Estatísticas por nível** (info, warn, error)
- **Logs recentes** com destaque para erros
- **Filtros e busca** por texto

## 🚀 Como Usar

### Iniciar o Sistema de Monitoramento

```bash
# No diretório backend/
npm run monitor
```

### Acessar o Dashboard

- **Dashboard Web**: http://localhost:3000/api/monitor/dashboard
- **API de Monitoramento**: http://localhost:3000/api/monitor
- **Documentação Swagger**: http://localhost:3000/api/docs

### Executar Testes via Dashboard

1. Acesse o dashboard web
2. Clique no botão "🧪 Executar Testes"
3. Aguarde a execução (máximo 60 segundos)
4. Visualize os resultados em tempo real

## 📁 Estrutura do Sistema

```
src/
├── api/monitor/
│   ├── route.ts                    # API principal de monitoramento
│   ├── dashboard/route.ts          # Interface web do dashboard
│   └── tests/run/route.ts          # Execução de testes
├── core/monitoring/
│   ├── system-metrics.ts           # Métricas do sistema
│   ├── database-status.ts          # Status do banco
│   ├── test-status.ts              # Status dos testes
│   └── log-status.ts               # Status dos logs
└── tests/
    └── monitor.test.ts             # Testes do sistema
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Banco de dados (para monitoramento)
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico

# Configurações do sistema
NODE_ENV=development
PORT=3000
```

### Thresholds de Alertas

Os thresholds são configurados nos módulos de monitoramento:

- **CPU**: Warning quando load > 80% dos cores
- **Memória**: Warning quando uso > 85%
- **Banco**: Warning quando resposta > 1000ms
- **Logs**: Error quando > 5 erros recentes

## 📈 Métricas Disponíveis

### API `/api/monitor`

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "system": {
    "status": "healthy",
    "cpu": {
      "usage": 25.5,
      "cores": 8,
      "loadAverage": [0.5, 0.3, 0.1]
    },
    "memory": {
      "total": 8589934592,
      "used": 4294967296,
      "free": 4294967296,
      "usage": 50.0
    },
    "uptime": 3600,
    "platform": "linux",
    "nodeVersion": "v18.17.0",
    "warnings": []
  },
  "database": {
    "status": "healthy",
    "connected": true,
    "responseTime": 45,
    "tables": {
      "count": 15,
      "list": ["users", "concursos", "apostilas"]
    },
    "connectionPool": {
      "active": 2,
      "idle": 8,
      "total": 10
    },
    "errors": []
  },
  "tests": {
    "status": "healthy",
    "lastRun": "2024-01-01T00:00:00.000Z",
    "totalTests": 150,
    "passedTests": 148,
    "failedTests": 2,
    "skippedTests": 0,
    "coverage": 85.5,
    "testFiles": ["tests/auth.test.ts", "tests/concursos.test.ts"],
    "recentResults": [],
    "errors": []
  },
  "logs": {
    "status": "healthy",
    "recentLogs": [
      {
        "timestamp": "2024-01-01T00:00:00.000Z",
        "level": "info",
        "message": "Servidor iniciado",
        "service": "app"
      }
    ],
    "logStats": {
      "total": 50,
      "errors": 0,
      "warnings": 2,
      "info": 48
    },
    "logFiles": [
      {
        "name": "app.log",
        "size": 1024,
        "lastModified": "2024-01-01T00:00:00.000Z"
      }
    ],
    "errors": []
  },
  "overall": {
    "status": "healthy",
    "uptime": 3600,
    "version": "1.0.0"
  }
}
```

## 🧪 Testes

### Executar Testes do Sistema

```bash
# Testes específicos do monitoramento
npm test tests/monitor.test.ts

# Todos os testes
npm test

# Testes com cobertura
npm run test:coverage
```

### Cobertura de Testes

O sistema inclui testes automatizados para:
- ✅ Métricas do sistema
- ✅ Status do banco de dados
- ✅ Descoberta de arquivos de teste
- ✅ Processamento de logs
- ✅ Tratamento de erros

## 🔄 Desenvolvimento

### Adicionar Novas Métricas

1. Crie um novo módulo em `src/core/monitoring/`
2. Implemente a interface de status
3. Adicione ao endpoint principal em `src/api/monitor/route.ts`
4. Crie testes em `tests/monitor.test.ts`

### Exemplo de Módulo

```typescript
// src/core/monitoring/custom-metric.ts
export interface CustomMetricStatus {
  status: 'healthy' | 'warning' | 'error';
  value: number;
  errors: string[];
}

export async function getCustomMetricStatus(): Promise<CustomMetricStatus> {
  // Implementação da métrica
  return {
    status: 'healthy',
    value: 42,
    errors: []
  };
}
```

## 🚨 Troubleshooting

### Problemas Comuns

**Dashboard não carrega**
- Verifique se o servidor está rodando
- Confirme a porta 3000 está livre
- Verifique os logs do console

**Métricas não aparecem**
- Verifique as variáveis de ambiente
- Confirme conectividade com o banco
- Verifique permissões de arquivo

**Testes não executam**
- Confirme que o Vitest está instalado
- Verifique se há arquivos de teste
- Confirme permissões de execução

### Logs de Debug

```bash
# Logs detalhados
DEBUG=* npm run monitor

# Apenas logs do monitoramento
DEBUG=monitor:* npm run monitor
```

## 📚 Próximos Passos

### Roadmap de Evolução

- [ ] **Autenticação**: Login obrigatório para acessar
- [ ] **Permissões**: Níveis de acesso (admin, dev, read-only)
- [ ] **Alertas**: Notificações por email/Slack
- [ ] **Histórico**: Armazenamento de métricas históricas
- [ ] **Integração CI/CD**: Gatilhos automáticos
- [ ] **Métricas customizadas**: API para adicionar métricas
- [ ] **Exportação**: Download de relatórios
- [ ] **Mobile**: Interface responsiva para dispositivos móveis

## 🤝 Contribuição

Para contribuir com o sistema de monitoramento:

1. Siga os padrões de código existentes
2. Adicione testes para novas funcionalidades
3. Mantenha a documentação atualizada
4. Execute `npm run lint` antes de commitar
5. Verifique se todos os testes passam

---

**Desenvolvido com ❤️ para o AprovaFácil** 