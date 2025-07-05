# Scripts de Limpeza de Cache

Este diretório contém scripts para limpar diferentes tipos de cache do projeto.

## Scripts Disponíveis

### 1. `clear-all-cache.js` - Limpeza Completa
Limpa todos os tipos de cache do projeto:
- Cache do Next.js (.next)
- Cache do npm
- Cache do banco de dados
- Cache em memória
- Arquivos temporários

**Uso:**
```bash
npm run cache:clear
# ou
node scripts/clear-all-cache.js
```

### 2. `clear-cache.js` - Cache do Next.js
Limpa apenas o cache do Next.js e arquivos temporários.

**Uso:**
```bash
npm run cache:clear-next
# ou
node scripts/clear-cache.js
```

### 3. `clear-db-cache.js` - Cache do Banco de Dados
Limpa o cache armazenado no banco de dados (tabela `user_performance_cache`).

**Uso:**
```bash
npm run cache:clear-db
# ou
node scripts/clear-db-cache.js
```

### 4. `clear-memory-cache.js` - Cache em Memória
Limpa o cache em memória do projeto (simulados, flashcards, apostilas, progresso).

**Uso:**
```bash
npm run cache:clear-memory
# ou
node scripts/clear-memory-cache.js
```

## Quando Usar

### Limpeza Completa (`cache:clear`)
- Quando há problemas persistentes de cache
- Após mudanças significativas no código
- Quando o projeto não está funcionando como esperado
- Antes de fazer deploy

### Cache do Next.js (`cache:clear-next`)
- Quando há problemas de build
- Após mudanças em componentes React
- Quando páginas não estão atualizando

### Cache do Banco (`cache:clear-db`)
- Quando dados não estão atualizando
- Após mudanças no banco de dados
- Quando estatísticas estão desatualizadas

### Cache em Memória (`cache:clear-memory`)
- Quando dados em tempo real não estão corretos
- Após mudanças em simulados ou flashcards
- Para forçar recarregamento de dados

## Tipos de Cache no Projeto

### 1. Cache do Next.js
- **Localização:** `.next/`
- **Conteúdo:** Build cache, páginas compiladas
- **TTL:** Até próximo build

### 2. Cache do Banco de Dados
- **Tabela:** `user_performance_cache`
- **Conteúdo:** Estatísticas de desempenho, dados de usuário
- **TTL:** Configurável (padrão: 30 minutos)

### 3. Cache em Memória
- **Simulados:** 10 minutos
- **Flashcards:** 15 minutos
- **Apostilas:** 30 minutos
- **Progresso do usuário:** 5 minutos

### 4. Cache do npm
- **Localização:** Cache global do npm
- **Conteúdo:** Pacotes baixados
- **TTL:** Até limpeza manual

## Próximos Passos Após Limpeza

1. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

2. **Se necessário, reinstale dependências:**
   ```bash
   npm install
   ```

3. **Teste a funcionalidade:**
   - Acesse diferentes páginas
   - Teste funcionalidades que estavam com problema
   - Verifique se os dados estão atualizados

## Dicas

- Use `cache:clear` como primeira opção para problemas de cache
- Use scripts específicos quando souber exatamente qual cache está causando problemas
- Sempre reinicie o servidor após limpeza de cache
- O cache em memória é limpo automaticamente ao reiniciar o servidor 