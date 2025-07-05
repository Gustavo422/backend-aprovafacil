# 🗄️ GUIA DE EXECUÇÃO DO BANCO DE DADOS

## 🚨 PROBLEMA IDENTIFICADO

Os erros que você está vendo são porque as tabelas não existem no banco de dados:

```
[ERROR] Erro ao buscar todas as questões semanais:
Context: {
  error: 'relation "public.questoes_semanais" does not exist',
  code: '42P01'
}
```

## ✅ SOLUÇÃO: EXECUTAR O SCRIPT SQL

### 📋 **PASSO A PASSO:**

#### 1. **Acesse o Supabase Dashboard**
- Vá para [supabase.com](https://supabase.com)
- Faça login na sua conta
- Selecione seu projeto

#### 2. **Abra o SQL Editor**
- No menu lateral, clique em **"SQL Editor"**
- Clique em **"New query"**

#### 3. **Execute o Script Completo**
- Abra o arquivo `DATABASE_SETUP_COMPLETE.sql` no seu projeto
- **Copie TODO o conteúdo** do arquivo
- Cole no SQL Editor do Supabase
- Clique em **"Run"** para executar

#### 4. **Aguarde a Execução**
- O script pode demorar alguns minutos
- Você verá mensagens de sucesso no final

---

## 📁 **ARQUIVOS CRIADOS:**

### ✅ **Script Principal:**
- `DATABASE_SETUP_COMPLETE.sql` - **EXECUTE ESTE ARQUIVO**

### 🔧 **Scripts Auxiliares:**
- `scripts/setup-database.js` - Script Node.js (opcional)
- `scripts/generate-sql-commands.js` - Gerador de comandos (opcional)

---

## 🎯 **O QUE O SCRIPT FAZ:**

### 1. **Limpeza Completa**
- Remove todas as tabelas antigas do sistema
- Preserva tabelas de autenticação do Supabase

### 2. **Criação do Schema**
- Cria todas as tabelas necessárias
- Configura relacionamentos e constraints
- Adiciona campos para o novo sistema

### 3. **Triggers e Índices**
- Configura atualização automática de timestamps
- Cria índices para melhor performance
- Otimiza consultas

### 4. **Dados de Exemplo**
- Insere categorias de concursos
- Cria concursos de exemplo
- Adiciona simulados, flashcards e apostilas
- Configura disciplinas por categoria

---

## 🚀 **APÓS A EXECUÇÃO:**

### ✅ **Verificações:**
1. **Teste o login** - deve funcionar normalmente
2. **Acesse o dashboard** - deve carregar sem erros
3. **Teste a seleção de concurso** - deve mostrar categorias
4. **Verifique simulados** - devem aparecer na lista

### 🔍 **Se Houver Problemas:**
1. Verifique se o script executou completamente
2. Confirme que todas as tabelas foram criadas
3. Teste uma API específica (ex: `/api/concurso-categorias`)

---

## 📊 **TABELAS CRIADAS:**

### **Categorias e Concursos:**
- `concurso_categorias` - Categorias de concursos
- `categoria_disciplinas` - Disciplinas por categoria
- `concursos` - Concursos específicos

### **Conteúdo:**
- `simulados` - Simulados de questões
- `simulado_questions` - Questões dos simulados
- `flashcards` - Flashcards de estudo
- `apostilas` - Apostilas de estudo
- `apostila_content` - Conteúdo das apostilas
- `mapa_assuntos` - Mapa de assuntos

### **Progresso do Usuário:**
- `user_concurso_preferences` - Preferências de concurso
- `user_simulado_progress` - Progresso em simulados
- `user_flashcard_progress` - Progresso em flashcards
- `user_apostila_progress` - Progresso em apostilas
- `user_mapa_assuntos_status` - Status do mapa de assuntos

### **Sistema:**
- `questoes_semanais` - Questões semanais
- `planos_estudo` - Planos de estudo
- `user_performance_cache` - Cache de performance
- `audit_logs` - Logs de auditoria
- `cache_config` - Configurações de cache
- `user_discipline_stats` - Estatísticas por disciplina

---

## ⚠️ **IMPORTANTE:**

### **⚠️ BACKUP ANTES DE EXECUTAR:**
- Se você tem dados importantes, faça backup primeiro
- O script **REMOVE** todas as tabelas antigas

### **🔒 SEGURANÇA:**
- Execute em um ambiente de teste primeiro
- Confirme que tudo funciona antes de usar em produção

### **📞 SUPORTE:**
- Se houver problemas, verifique os logs do Supabase
- Confirme que as variáveis de ambiente estão corretas

---

## 🎉 **RESULTADO ESPERADO:**

Após executar o script, você deve ver:

```
========================================
BANCO DE DADOS CONFIGURADO COM SUCESSO!
========================================
Todas as tabelas foram criadas.
Triggers e índices foram configurados.
Dados de exemplo foram inseridos.
O sistema de concursos está pronto para uso!
========================================
```

**Agora o sistema deve funcionar perfeitamente! 🚀** 