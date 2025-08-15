# Deprecação das Rotas Antigas de Questões Semanais

## Visão Geral

As rotas antigas de questões semanais foram **marcadas como deprecatadas** e serão **removidas em 01/06/2024**. Este documento explica o processo de migração e as alternativas recomendadas.

## Rotas Deprecatadas

### ❌ Rotas Antigas (DEPRECATED)

- `GET /api/questoes-semanais` - Listar questões semanais
- `GET /api/questoes-semanais/:id` - Buscar questão específica
- `GET /api/v1/questoes-semanais` - Versão v1 (também deprecatada)

### ✅ Rotas Novas (RECOMENDADAS)

- `GET /api/questoes-semanais/atual` - Semana atual com questões
- `GET /api/questoes-semanais/roadmap` - Roadmap de semanas
- `GET /api/questoes-semanais/historico` - Histórico de semanas concluídas
- `POST /api/questoes-semanais/:numero_semana/concluir` - Concluir semana

## Cronograma de Deprecação

| Data | Ação | Status |
|------|------|--------|
| 01/01/2024 | Rotas marcadas como deprecatadas | ✅ Concluído |
| 01/03/2024 | Warnings mais agressivos | 🔄 Em desenvolvimento |
| 01/06/2024 | Rotas removidas | ⏳ Pendente |

## Headers de Deprecação

As rotas antigas retornam os seguintes headers para observabilidade:

```
x-deprecated: true
x-deprecated-since: 2024-01-01
x-recommended-route: /api/questoes-semanais/atual
x-sunset-date: 2024-06-01
```

## Logs de Deprecação

Todas as chamadas às rotas antigas geram logs de warning com:

- ID do usuário
- ID do concurso
- User-Agent
- IP do cliente
- Rota deprecada
- Rota recomendada

## Migração do Frontend

O frontend já foi **completamente migrado** para os novos endpoints:

- ✅ `useWeeklyQuestions()` usa `/atual`, `/roadmap`, `/historico`
- ✅ Página `/questoes-semanais` usa novos endpoints
- ✅ Hooks customizados implementados
- ✅ Estados otimistas configurados

## Compatibilidade

### ✅ Mantido

- Funcionamento das rotas antigas
- Filtro de concurso
- Autenticação
- Validação de parâmetros

### ❌ Removido

- Paginação complexa (substituída por cursor-based)
- Filtros avançados (disciplina, dificuldade)
- Headers de performance antigos

## Testes

### Script de Teste Atualizado

O script `frontend/scripts/test-questoes-semanais.js` foi atualizado para:

1. ✅ Testar endpoints novos
2. ⚠️ Testar endpoints antigos (com warnings)
3. 📊 Verificar headers de deprecação
4. 📋 Gerar relatório de migração

### Executar Testes

```bash
cd frontend
node scripts/test-questoes-semanais.js
```

## Monitoramento

### Métricas de Deprecação

- Contagem de chamadas às rotas antigas
- Usuários ainda usando rotas antigas
- Taxa de migração para novos endpoints

### Alertas

- Rotas antigas com alto volume de uso
- Usuários não migrando após warnings
- Erros nas rotas antigas

## Rollback

Em caso de problemas críticos, as rotas antigas podem ser reativadas temporariamente:

1. Remover comentários de deprecação
2. Remover headers de deprecação
3. Ajustar data de sunset
4. Notificar equipe

## Próximos Passos

1. ✅ Implementar warnings de deprecação
2. 🔄 Monitorar uso das rotas antigas
3. ⏳ Implementar warnings mais agressivos (Março)
4. ⏳ Remover rotas antigas (Junho)
5. ⏳ Limpar código legacy

## Contato

Para dúvidas sobre a migração, entre em contato com a equipe de backend ou abra uma issue no repositório.
