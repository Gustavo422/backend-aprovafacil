# 🧪 Guia de Teste do Sistema de Concursos

## 📋 Visão Geral

Este guia te ajudará a testar todo o sistema de concursos implementado, incluindo:
- ✅ Banco de dados e migrações
- ✅ APIs e endpoints
- ✅ Contexto global de concursos
- ✅ Interface de seleção
- ✅ Middleware de proteção
- ✅ Filtros de conteúdo

---

## 🚀 Como Testar

### **1. Iniciar o Servidor**

```bash
npm run dev
```

O servidor deve iniciar em `http://localhost:3000`

### **2. Páginas de Teste Disponíveis**

#### **A) Teste do Sistema** - `/teste-sistema`
- Testa conexão com banco de dados
- Verifica tabelas e relacionamentos
- Testa APIs
- Permite inserir dados de exemplo

#### **B) Teste de Seleção** - `/teste-selecao`
- Testa o contexto global de concursos
- Permite abrir o seletor de concursos
- Mostra dados do contexto em tempo real
- Testa limpeza de contexto

#### **C) Página de Seleção** - `/selecionar-concurso`
- Página oficial de seleção de concurso
- Interface completa com filtros
- Redirecionamento após seleção

#### **D) Dashboard** - `/dashboard`
- Testa se o middleware funciona
- Verifica se o conteúdo é filtrado por concurso

---

## 🔍 Testes Específicos

### **Teste 1: Banco de Dados**

1. Acesse `/teste-sistema`
2. Clique em "🔄 Executar Testes"
3. Verifique se todas as tabelas estão funcionando:
   - ✅ Categorias
   - ✅ Concursos
   - ✅ Disciplinas
   - ✅ Simulados
   - ✅ APIs

**Resultado Esperado:**
```
📊 Categorias: 0 (ou mais se houver dados)
📊 Concursos: 0 (ou mais se houver dados)
📊 Disciplinas: 0 (ou mais se houver dados)
📊 Simulados: 0 (ou mais se houver dados)
```

### **Teste 2: Inserir Dados de Exemplo**

1. Na página `/teste-sistema`
2. Clique em "📝 Inserir Dados de Exemplo"
3. Aguarde a inserção
4. Execute os testes novamente

**Resultado Esperado:**
```
✅ 5 categorias inseridas
✅ 20+ disciplinas inseridas
✅ 5 concursos inseridos
✅ 3 simulados inseridos
✅ 3 flashcards inseridos
```

### **Teste 3: Contexto Global**

1. Acesse `/teste-selecao`
2. Verifique o status atual:
   - Deve mostrar "Nenhum concurso selecionado"
   - Estado deve ser "✅ Inicializado"

3. Clique em "🎯 Abrir Seletor de Concurso"
4. Selecione um concurso
5. Verifique se o contexto foi atualizado

**Resultado Esperado:**
```
Concurso Selecionado: [Nome do Concurso]
Categoria: [Nome da Categoria]
ID do Concurso: [ID]
Estado: ✅ Inicializado
```

### **Teste 4: Fluxo Completo**

1. Acesse `/selecionar-concurso`
2. Use os filtros para encontrar um concurso
3. Clique em "Selecionar" em um concurso
4. Deve redirecionar para `/dashboard`

**Resultado Esperado:**
- Redirecionamento automático
- Toast de sucesso
- Dashboard carregado com conteúdo filtrado

### **Teste 5: Middleware de Proteção**

1. Acesse `/dashboard` sem ter selecionado concurso
2. Deve redirecionar para `/selecionar-concurso`

**Resultado Esperado:**
- Redirecionamento automático
- Mensagem de erro ou toast

### **Teste 6: APIs**

1. Acesse diretamente as APIs:
   - `http://localhost:3000/api/concurso-categorias`
   - `http://localhost:3000/api/concursos`
   - `http://localhost:3000/api/categoria-disciplinas`

**Resultado Esperado:**
```json
{
  "success": true,
  "data": [...],
  "message": "Dados carregados com sucesso"
}
```

---

## 🐛 Solução de Problemas

### **Problema: Erro de Conexão com Banco**

**Sintomas:**
- Erro "Failed to fetch" nos testes
- APIs retornando erro 500

**Solução:**
1. Verifique as variáveis de ambiente no `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

2. Verifique se o banco está online no Supabase

### **Problema: Tabelas Não Existem**

**Sintomas:**
- Erro "relation does not exist"
- Contagem zero em todas as tabelas

**Solução:**
1. Execute as migrações SQL no Supabase
2. Verifique se as foreign keys foram criadas
3. Execute o script de inserção de dados

### **Problema: Contexto Não Funciona**

**Sintomas:**
- Seletor não abre
- Dados não aparecem no contexto

**Solução:**
1. Verifique se o `ConcursoProvider` está no layout
2. Verifique se as APIs estão funcionando
3. Verifique o console do navegador para erros

### **Problema: Middleware Não Funciona**

**Sintomas:**
- Pode acessar `/dashboard` sem selecionar concurso
- Não redireciona automaticamente

**Solução:**
1. Verifique se o middleware está configurado no `next.config.mjs`
2. Verifique se as rotas estão corretas
3. Limpe o cache do Next.js

---

## 📊 Checklist de Testes

### **Banco de Dados**
- [ ] Tabelas criadas corretamente
- [ ] Foreign keys funcionando
- [ ] Índices criados
- [ ] Dados de exemplo inseridos

### **APIs**
- [ ] `/api/concurso-categorias` funcionando
- [ ] `/api/concursos` funcionando
- [ ] `/api/categoria-disciplinas` funcionando
- [ ] `/api/user/concurso-preference` funcionando

### **Contexto**
- [ ] `ConcursoProvider` carregando
- [ ] `useConcurso` funcionando
- [ ] Seleção de concurso funcionando
- [ ] Limpeza de contexto funcionando

### **Interface**
- [ ] Seletor de concurso abrindo
- [ ] Filtros funcionando
- [ ] Seleção redirecionando
- [ ] Toast de sucesso aparecendo

### **Middleware**
- [ ] Proteção de rotas funcionando
- [ ] Redirecionamento automático
- [ ] Verificação de preferência

### **Conteúdo Filtrado**
- [ ] Simulados filtrados por categoria
- [ ] Flashcards filtrados por categoria
- [ ] Progresso específico por concurso

---

## 🎯 Próximos Passos

Após os testes, você pode:

1. **Personalizar o Dashboard** para usar o contexto
2. **Implementar mais APIs** de conteúdo filtrado
3. **Adicionar mais concursos** e categorias
4. **Implementar sistema de progresso** detalhado
5. **Adicionar funcionalidades** como troca de concurso

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique o console do navegador
2. Verifique os logs do servidor
3. Verifique o painel do Supabase
4. Execute os testes novamente
5. Consulte este guia

**Boa sorte nos testes! 🚀** 