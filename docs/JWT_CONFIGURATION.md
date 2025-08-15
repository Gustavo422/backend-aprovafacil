# 🔐 Configuração de JWT - AprovaFácil

## ⚠️ **PROBLEMA IDENTIFICADO E CORRIGIDO**

O sistema estava configurado com valores **INSEGUROS** para tokens de acesso:
- **Access Token**: 30 dias (2592000 segundos) ❌
- **Refresh Token**: 90 dias (7776000 segundos) ❌

## ✅ **CONFIGURAÇÃO CORRIGIDA**

### **Valores Padrão Seguros (implementados no código):**
```bash
JWT_ACCESS_EXPIRY=900      # 15 minutos
JWT_REFRESH_EXPIRY=604800  # 7 dias
```

### **Seu .env atual (PROBLEMÁTICO):**
```bash
JWT_ACCESS_EXPIRY=43800m   # ❌ Formato incorreto (deve ser segundos)
JWT_REFRESH_EXPIRY=7d      # ❌ Formato incorreto (deve ser segundos)
```

## 🛠️ **SOLUÇÃO IMEDIATA**

### **1. Corrigir seu .env:**
```bash
# ❌ REMOVER ESTAS LINHAS:
# JWT_ACCESS_EXPIRY=43800m
# JWT_REFRESH_EXPIRY=7d

# ✅ ADICIONAR ESTAS LINHAS:
JWT_ACCESS_EXPIRY=900
JWT_REFRESH_EXPIRY=604800
```

### **2. Reiniciar o backend após a correção**

## 📊 **OPÇÕES DE CONFIGURAÇÃO**

### **DESENVOLVIMENTO - OPÇÃO 1 (Recomendada para dev)**
```bash
JWT_ACCESS_EXPIRY=3600     # 1 hora
JWT_REFRESH_EXPIRY=604800  # 7 dias
```

### **DESENVOLVIMENTO - OPÇÃO 2 (15 dias - Aceitável para dev)**
```bash
JWT_ACCESS_EXPIRY=1296000  # 15 dias
JWT_REFRESH_EXPIRY=2592000 # 30 dias
```

### **PRODUÇÃO (Recomendado para produção)**
```bash
JWT_ACCESS_EXPIRY=900      # 15 minutos
JWT_REFRESH_EXPIRY=259200  # 3 dias
```

### **TESTE (Apenas para testes)**
```bash
JWT_ACCESS_EXPIRY=7200     # 2 horas
JWT_REFRESH_EXPIRY=1209600 # 14 dias
```

## 🔒 **POR QUE ESSA MUDANÇA?**

### **Segurança:**
- **Access tokens** de longa duração são um risco de segurança
- Se comprometidos, dão acesso por muito tempo
- **Refresh tokens** podem durar mais, mas devem ser limitados

### **Padrões da Indústria:**
- **Google**: Access token 1 hora, Refresh token 2 semanas
- **GitHub**: Access token 1 hora, Refresh token 8 horas
- **AWS**: Access token 1 hora, Refresh token 1 ano

### **Conformidade:**
- **OAuth 2.0**: Recomenda tokens de acesso de curta duração
- **JWT Best Practices**: Máximo 1 hora para access tokens

## 🚀 **IMPLEMENTAÇÃO AUTOMÁTICA**

O código foi corrigido para:
1. ✅ Usar valores seguros por padrão
2. ✅ Validar formatos corretos
3. ✅ Manter consistência entre backend e frontend
4. ✅ Configurar cookies com expiração correta

## 📝 **PRÓXIMOS PASSOS**

1. **Corrigir o .env** com os valores recomendados
2. **Reiniciar o backend**
3. **Testar o login** - deve funcionar por 15 minutos
4. **Verificar refresh automático** - deve renovar sem logout

## 🆘 **EM CASO DE PROBLEMAS**

Se ainda houver problemas após a correção:
1. Verificar logs do backend
2. Confirmar que o .env foi salvo corretamente
3. Verificar se não há cache de configuração
4. Reiniciar completamente o servidor
