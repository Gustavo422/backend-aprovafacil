# Rate Limit Troubleshooting

## Problema: "Request rate limit reached"

O erro "Request rate limit reached" ocorre quando o Supabase (serviço de autenticação) detecta muitas tentativas de login em um curto período de tempo. Este é um mecanismo de segurança para prevenir ataques de força bruta.

## Causas Comuns

1. **Múltiplas tentativas de login**: Tentar fazer login várias vezes rapidamente
2. **Credenciais incorretas**: Tentativas repetidas com email/senha incorretos
3. **Desenvolvimento/teste**: Durante desenvolvimento, pode haver muitas tentativas de teste
4. **Usuários compartilhando IP**: Múltiplos usuários tentando login do mesmo IP

## Soluções Implementadas

### 1. Tentativa Única por Padrão

Por padrão, o sistema faz **apenas uma tentativa** de login/registro. Isso evita múltiplas tentativas automáticas que podem piorar o problema de rate limit.

### 2. Retry Opcional com Backoff Exponencial

O retry automático agora é **opcional** e só é habilitado quando explicitamente configurado:

```typescript
// Tentativa única (padrão)
const result = await retryWithBackoff(async () => {
  return await supabase.auth.signInWithPassword({...})
})

// Retry habilitado (quando necessário)
const result = await retryWithBackoffEnabled(async () => {
  return await supabase.auth.signInWithPassword({...})
}, {
  onRetry: (attempt, delay) => {
    console.log(`Tentativa ${attempt}: Aguardando ${delay}ms...`)
  }
})
```

### 3. Tratamento Correto de Erros do Supabase

**Problema identificado**: O Supabase não lança exceções, mas retorna erros no objeto `result.error`.

**Solução implementada**:

```typescript
// Verificar se o resultado tem um erro (caso do Supabase)
if (result && typeof result === 'object' && 'error' in result && result.error) {
  const error = result.error as SupabaseError;

  // Se é um erro de rate limit e retry está habilitado
  if (
    error.message?.includes('rate limit') &&
    enableRetry &&
    attempt < actualMaxRetries
  ) {
    // Fazer retry com delay exponencial
  }

  // Se não é rate limit ou retry não está habilitado, lançar o erro
  throw error;
}
```

### 4. Feedback Visual Melhorado

- Botão mostra "Entrando..." durante a tentativa
- Toast notifications informam sobre erros
- Componente informativo explica o rate limit

### 5. Hook Personalizado (`useAuthRetry`)

```typescript
const {
  retryWithBackoff, // Tentativa única (padrão)
  retryWithBackoffEnabled, // Retry habilitado
  getRateLimitMessage,
  isRetrying,
} = useAuthRetry();
```

## Como Usar

### Para Desenvolvedores

1. **Importe o hook**:

```typescript
import { useAuthRetry } from '@/hooks/use-auth-retry';
```

2. **Use para tentativa única (padrão)**:

```typescript
const result = await retryWithBackoff(async () => {
  return await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });
});

// Verificar se há erro
if (result.error) {
  // Tratar erro
}
```

3. **Use para retry habilitado (quando necessário)**:

```typescript
const result = await retryWithBackoffEnabled(
  async () => {
    return await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
  },
  {
    onRetry: (attempt, delay) => {
      toast({
        title: 'Tentativa de login',
        description: `Aguardando ${Math.round(delay / 1000)}s antes da tentativa ${attempt}...`,
      });
    },
  }
);
```

### Para Usuários

1. **Aguarde alguns minutos** se receber o erro de rate limit
2. **Verifique suas credenciais** antes de tentar novamente
3. **Não tente fazer login repetidamente** rapidamente

## Configurações do Supabase

O rate limit padrão do Supabase é:

- **Login**: 5 tentativas por minuto por IP
- **Registro**: 3 tentativas por minuto por IP
- **Reset de senha**: 3 tentativas por minuto por IP

## Monitoramento

Para monitorar rate limits em produção:

1. **Logs do Supabase**: Verifique os logs de autenticação
2. **Console do navegador**: Logs de erro são exibidos
3. **Toast notifications**: Feedback em tempo real para o usuário

## Prevenção

1. **Validação de formulários**: Valide dados antes de enviar
2. **Debounce**: Evite múltiplos cliques no botão
3. **Feedback imediato**: Mostre erros de validação rapidamente
4. **Testes**: Use diferentes emails para testes

## Teste

Use o componente `RateLimitTest` para testar o tratamento de rate limits:

```typescript
import { RateLimitTest } from '@/components/rate-limit-test';
```

## Limitações

- Rate limits são por IP, não por usuário
- Não há como contornar completamente os limites do Supabase
- Em desenvolvimento, considere usar contas de teste diferentes

## Correções Recentes

### v1.2 - Tentativa Única por Padrão

- **Problema**: Sistema fazia múltiplas tentativas automáticas
- **Solução**: Retry agora é opcional e por padrão faz apenas uma tentativa
- **Resultado**: Evita piorar o problema de rate limit

### v1.1 - Correção do Tratamento de Erros

- **Problema**: O hook não estava detectando corretamente os erros do Supabase
- **Solução**: Implementada verificação específica para `result.error`
- **Resultado**: Tratamento correto de erros do Supabase
