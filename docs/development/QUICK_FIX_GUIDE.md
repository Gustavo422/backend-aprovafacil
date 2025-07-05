# 🚨 Guia de Correção Rápida - Study App

## ⚡ **Ações Imediatas Necessárias**

### 1. **Configurar Foreign Keys (CRÍTICO)**

```sql
-- Execute no Supabase SQL Editor:
-- Copie e cole o conteúdo do arquivo setup_foreign_keys.sql
```

### 2. **Popular Dados de Exemplo**

```sql
-- Execute no Supabase SQL Editor:
-- Copie e cole o conteúdo do arquivo sample_data.sql
```

### 3. **Reiniciar o Servidor**

```bash
# Pare o servidor (Ctrl+C) e reinicie
npm run dev
```

---

## 🔍 **Erros Identificados e Soluções**

### ❌ **Erro: Foreign Key Relationship**

```
Could not find a relationship between 'planos_estudo' and 'concursos'
```

**✅ Solução**: Execute o script `setup_foreign_keys.sql`

### ❌ **Erro: Client Component Event Handlers**

```
Event handlers cannot be passed to Client Component props
```

**✅ Solução**: Já corrigido nas APIs, mas pode haver componentes frontend

### ❌ **Erro: Cookies Sync**

```
cookies() should be awaited before using its value
```

**✅ Solução**: Já corrigido nas APIs

---

## 🧪 **Teste Rápido**

### 1. **Testar APIs**

```bash
# Teste cada endpoint
curl http://localhost:3000/api/concursos
curl http://localhost:3000/api/simulados
curl http://localhost:3000/api/apostilas
```

### 2. **Verificar Frontend**

- Acesse: `http://localhost:3000/dashboard/simulados`
- Acesse: `http://localhost:3000/dashboard/apostilas`
- Acesse: `http://localhost:3000/dashboard`

### 3. **Verificar Logs**

- Monitore o console do servidor
- Verifique se não há mais erros 500

---

## 📋 **Checklist de Correção**

- [ ] Executar `setup_foreign_keys.sql`
- [ ] Executar `sample_data.sql`
- [ ] Reiniciar servidor
- [ ] Testar APIs
- [ ] Testar frontend
- [ ] Verificar logs

---

## 🆘 **Se Ainda Houver Problemas**

### 1. **Verificar Supabase**

- Confirme que o projeto está ativo
- Verifique as permissões RLS
- Confirme que as tabelas existem

### 2. **Verificar Variáveis de Ambiente**

```bash
# Confirme que .env.local tem:
NEXT_PUBLIC_SUPABASE_URL=sua_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave
```

### 3. **Limpar Cache**

```bash
# Limpar cache do Next.js
rm -rf .next
npm run dev
```

---

## ✅ **Resultado Esperado**

Após as correções:

- ✅ APIs retornando dados corretamente
- ✅ Frontend carregando sem erros
- ✅ Simulados funcionando
- ✅ Apostilas funcionando
- ✅ Dashboard funcionando

**Status**: 🟢 **Pronto para uso**
