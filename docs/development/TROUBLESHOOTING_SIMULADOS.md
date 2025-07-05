# 🔧 Solução para Problema de Carregamento de Simulados

## 🚨 Problema Identificado

Os simulados não estão carregando devido a vários problemas relacionados à nova versão do Next.js e estrutura do banco de dados.

## ✅ Soluções Aplicadas

### 1. **Correção do Parâmetro `params` (JÁ FEITO)**
- ✅ Atualizado `app/dashboard/simulados/[id]/page.tsx` para usar `React.use()` 
- ✅ Atualizado `app/api/simulados/[id]/route.ts` para aguardar `params`
- ✅ Atualizado `app/api/simulados/[id]/questoes/route.ts` para aguardar `params`

### 2. **Correção das Queries do Supabase (JÁ FEITO)**
- ✅ Mudado `.eq('deleted_at', null)` para `.is('deleted_at', null)`
- ✅ Corrigido logging de erros para melhor debugging

### 3. **API de Teste Criada (NOVO)**
- ✅ Criado `app/api/simulados/[id]/test/route.ts` para debug sem autenticação

## 🗄️ Próximos Passos - Verificar e Inserir Dados

### Passo 1: Verificar Dados Existentes

Execute este script no Supabase SQL Editor:

```sql
-- Execute o arquivo: scripts/check-data.sql
```

Este script irá mostrar:
- Quantos simulados existem
- Quantas questões existem  
- Quantos concursos existem
- Lista de simulados disponíveis
- Lista de questões disponíveis

### Passo 2: Se Não Há Dados, Inserir

Execute um destes scripts:

**Opção A - UUIDs Automáticos (RECOMENDADO):**
```sql
-- Execute o arquivo: scripts/insert-sample-data-auto-uuid.sql
```

**Opção B - UUIDs Corrigidos:**
```sql
-- Execute o arquivo: scripts/insert-sample-data.sql
```

### Passo 3: Testar a API

**Teste a API de debug (sem autenticação):**
```bash
# Substitua [ID] pelo ID do simulado que você tem
curl http://localhost:3000/api/simulados/[ID]/test
```

**Teste a API normal:**
```bash
curl http://localhost:3000/api/simulados/[ID]
```

## 🔍 Verificação da Conexão

### 1. **Verificar Console do Navegador**
- Abra as ferramentas de desenvolvedor (F12)
- Vá para a aba "Console"
- Verifique se há erros de rede ou JavaScript

### 2. **Verificar Logs do Servidor**
- Observe os logs no terminal onde o `npm run dev` está rodando
- Procure por erros específicos do Supabase

### 3. **Verificar Variáveis de Ambiente**
Confirme que estas variáveis estão corretas no `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-do-supabase
```

## 🐛 Problemas Comuns e Soluções

### Erro: "invalid input syntax for type timestamp with time zone: 'null'"
**Causa:** Campo `deleted_at` está sendo tratado como string "null" em vez de NULL
**Solução:** ✅ Já corrigido usando `.is('deleted_at', null)`

### Erro: "params property was accessed directly"
**Causa:** Nova versão do Next.js requer `React.use()` para params
**Solução:** ✅ Já corrigido em todas as páginas e APIs

### Erro: "cookies() should be awaited"
**Causa:** Nova versão do Next.js requer await para cookies
**Solução:** ✅ Já corrigido em todas as APIs

### Erro: "invalid input syntax for type uuid"
**Causa:** UUIDs inválidos no script SQL
**Solução:** ✅ Use o script com UUIDs automáticos

## 📋 Checklist de Verificação

- [ ] Script `check-data.sql` executado no Supabase
- [ ] Dados verificados (simulados, questões, concursos)
- [ ] Se vazio, script de inserção executado
- [ ] API de teste funcionando (`/api/simulados/[ID]/test`)
- [ ] Servidor Next.js reiniciado (`npm run dev`)
- [ ] Navegador com cache limpo (Ctrl+F5)
- [ ] Console do navegador sem erros
- [ ] Logs do servidor sem erros críticos

## 🎯 IDs de Teste

Após executar o script SQL, você pode testar com:

1. **IDs gerados automaticamente** (mostrados no final do script)
2. **ID específico:** `a23ba1cd-e472-4cdc-acf7-1818e16941dc` (se existir)

## 🔧 Debug Rápido

### 1. **Teste Direto no Supabase**
```sql
-- Verificar se há dados
SELECT COUNT(*) FROM simulados WHERE deleted_at IS NULL;
SELECT COUNT(*) FROM simulado_questions WHERE deleted_at IS NULL;
```

### 2. **Teste API de Debug**
```bash
curl http://localhost:3000/api/simulados/[ID]/test
```

### 3. **Verificar Autenticação**
```bash
curl http://localhost:3000/api/simulados/[ID]
```

## 📞 Se o Problema Persistir

1. **Execute o script de verificação** primeiro
2. **Verifique se há dados** no banco
3. **Teste a API de debug** para isolar o problema
4. **Verifique as políticas RLS** do Supabase
5. **Confirme as variáveis de ambiente**

## 🔄 Reinicialização Completa

Se nada funcionar, tente:

1. Parar o servidor (`Ctrl+C`)
2. Limpar cache: `npm run build && npm run dev`
3. Limpar cache do navegador
4. Executar o script de verificação
5. Se vazio, executar o script de inserção
6. Testar novamente

---

**Status:** ✅ Correções técnicas aplicadas - Aguardando verificação de dados e inserção se necessário 