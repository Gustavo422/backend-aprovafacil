# Guia de Tratamento de Erros

Este guia explica como usar o sistema robusto de tratamento de erros implementado no AprovaFácil.

## Visão Geral

O sistema de tratamento de erros foi projetado para:

- ✅ **Capturar todos os tipos de erro** sem quebrar a aplicação
- ✅ **Exibir mensagens amigáveis** ao usuário
- ✅ **Logar erros** para monitoramento e debug
- ✅ **Fornecer ações de recuperação** (tentar novamente, voltar, etc.)
- ✅ **Padronizar o tratamento** em toda a aplicação

## Componentes Principais

### 1. ErrorBoundary Global

O `ErrorBoundary` captura erros de React e exibe uma interface amigável:

```tsx
// Já configurado no app/layout.tsx
<ErrorBoundary>{children}</ErrorBoundary>
```

### 2. Páginas de Erro Globais

- **`app/error.tsx`** - Erros de páginas Next.js
- **`app/not-found.tsx`** - Páginas não encontradas
- **`app/loading.tsx`** - Estado de carregamento

### 3. Hooks de Tratamento de Erros

#### Hook Genérico

```tsx
import { useErrorHandler } from '@/hooks/use-error-handler';

function MyComponent() {
  const { data, error, isLoading, execute, reset } = useErrorHandler({
    showToast: true,
    toastTitle: 'Erro',
    fallbackMessage: 'Ocorreu um erro inesperado.',
  });

  const handleOperation = async () => {
    await execute(async () => {
      // Sua operação aqui
      const result = await fetch('/api/data');
      if (!result.ok) throw new Error('Falha na requisição');
      return result.json();
    });
  };

  return (
    <div>
      {isLoading && <p>Carregando...</p>}
      {error && <p>Erro: {error.message}</p>}
      {data && <p>Sucesso: {JSON.stringify(data)}</p>}
      <button onClick={handleOperation}>Executar</button>
    </div>
  );
}
```

#### Hooks Especializados

```tsx
import {
  useAuthErrorHandler,
  useDataErrorHandler,
  useFormErrorHandler,
} from '@/hooks/use-error-handler';

// Para autenticação
const authHandler = useAuthErrorHandler();

// Para operações de dados
const dataHandler = useDataErrorHandler();

// Para formulários
const formHandler = useFormErrorHandler();
```

### 4. Utilitários de Erro

```tsx
import {
  createError,
  createValidationError,
  createAuthError,
  createNotFoundError,
  createRateLimitError,
  createServerError,
  withErrorHandling,
} from '@/lib/error-utils';

// Criar erros padronizados
throw createValidationError('Campo obrigatório', 'email');

// Wrapper para operações
const result = await withErrorHandling(
  async () => {
    // Sua operação aqui
    return await someAsyncOperation();
  },
  { context: 'userOperation' }
);
```

### 5. Middleware para APIs

```tsx
import {
  composeMiddleware,
  withApiErrorHandler,
  withAuthValidation,
  withRateLimit,
  withInputValidation,
} from '@/middleware/error-handler';

// Handler da API
async function handleRequest(request: NextRequest) {
  // Sua lógica aqui
  return NextResponse.json({ data: 'success' });
}

// Exportar com middlewares
export const GET = composeMiddleware(handleRequest, [
  withApiErrorHandler,
  withAuthValidation,
  withRateLimit({ maxRequests: 100 }),
  withInputValidation(validator),
]);
```

## Tipos de Erro Suportados

### Erros de Autenticação

- Credenciais inválidas
- Email não confirmado
- Usuário já cadastrado
- Sessão expirada

### Erros de Validação

- Campos obrigatórios
- Formato inválido
- Dados incorretos

### Erros de Rede

- Falha de conexão
- Timeout
- Rate limit

### Erros de Servidor

- Erro interno (500)
- Serviço indisponível
- Banco de dados

## Mensagens de Erro Amigáveis

O sistema automaticamente traduz erros técnicos em mensagens amigáveis:

```tsx
// Erro técnico
'Request rate limit reached';

// Mensagem amigável
'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
```

## Logging e Monitoramento

Todos os erros são automaticamente logados com contexto:

```tsx
// Informações logadas
{
  message: "Erro específico",
  stack: "Stack trace completo",
  context: { userId, operation, timestamp },
  userAgent: "Navegador do usuário",
  url: "URL onde ocorreu o erro"
}
```

## Exemplos Práticos

### Exemplo 1: Login com Tratamento de Erro

```tsx
function LoginForm() {
  const authHandler = useAuthErrorHandler();

  const handleLogin = async (email: string, password: string) => {
    await authHandler.execute(async () => {
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (result.error) {
        throw result.error;
      }

      return result.data;
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos do formulário */}
      <button disabled={authHandler.isLoading}>
        {authHandler.isLoading ? 'Entrando...' : 'Entrar'}
      </button>

      {authHandler.error && (
        <p className="text-red-500">{authHandler.error.message}</p>
      )}
    </form>
  );
}
```

### Exemplo 2: API com Middleware

```tsx
// app/api/users/route.ts
import { createError, withErrorHandling } from '@/lib/error-utils';
import {
  composeMiddleware,
  withApiErrorHandler,
} from '@/middleware/error-handler';

async function handleGet(request: NextRequest) {
  return await withErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw createError('ID é obrigatório', 'MISSING_REQUIRED_FIELD', 400);
    }

    const user = await getUserById(id);
    if (!user) {
      throw createError('Usuário não encontrado', 'RESOURCE_NOT_FOUND', 404);
    }

    return NextResponse.json(user);
  });
}

export const GET = composeMiddleware(handleGet, [withApiErrorHandler]);
```

### Exemplo 3: Componente com Múltiplos Hooks

```tsx
function UserDashboard() {
  const dataHandler = useDataErrorHandler();
  const formHandler = useFormErrorHandler();

  // Carregar dados do usuário
  useEffect(() => {
    dataHandler.execute(async () => {
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Falha ao carregar perfil');
      return response.json();
    });
  }, []);

  // Atualizar perfil
  const handleUpdateProfile = async (data: any) => {
    await formHandler.execute(async () => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Falha ao atualizar perfil');
      return response.json();
    });
  };

  return (
    <div>
      {dataHandler.isLoading && <p>Carregando perfil...</p>}
      {dataHandler.error && <p>Erro: {dataHandler.error.message}</p>}
      {dataHandler.data && (
        <ProfileForm data={dataHandler.data} onSubmit={handleUpdateProfile} />
      )}

      {formHandler.isLoading && <p>Salvando...</p>}
      {formHandler.error && <p>Erro ao salvar: {formHandler.error.message}</p>}
    </div>
  );
}
```

## Boas Práticas

### 1. Sempre Use os Hooks

```tsx
// ❌ Ruim
try {
  const data = await fetch('/api/data');
} catch (error) {
  console.error(error);
  // Usuário não vê o erro
}

// ✅ Bom
const dataHandler = useDataErrorHandler();
await dataHandler.execute(async () => {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error('Falha na requisição');
  return response.json();
});
```

### 2. Use Hooks Especializados

```tsx
// ✅ Para autenticação
const authHandler = useAuthErrorHandler();

// ✅ Para dados
const dataHandler = useDataErrorHandler();

// ✅ Para formulários
const formHandler = useFormErrorHandler();
```

### 3. Forneça Contexto nos Erros

```tsx
// ✅ Bom
throw createError('Usuário não encontrado', 'RESOURCE_NOT_FOUND', 404, {
  userId: id,
  operation: 'getUser',
});
```

### 4. Use Middleware em APIs

```tsx
// ✅ Sempre use middleware para APIs
export const GET = composeMiddleware(handler, [
  withApiErrorHandler,
  withAuthValidation,
]);
```

## Configuração Avançada

### Personalizar Mensagens

```tsx
const customHandler = useErrorHandler({
  showToast: true,
  toastTitle: 'Erro Personalizado',
  fallbackMessage: 'Algo deu errado na operação.',
  onError: error => {
    // Lógica customizada de erro
    console.log('Erro customizado:', error);
  },
});
```

### Integração com Monitoramento

```tsx
// Em lib/error-utils.ts, função logError
export function logError(error: any, context?: Record<string, any>) {
  const errorInfo = {
    message: error?.message,
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error('Erro registrado:', errorInfo);

  // Integrar com Sentry, LogRocket, etc.
  // Sentry.captureException(error, { extra: context })
}
```

## Testando o Sistema

Use o componente `ErrorExample` para testar diferentes cenários:

```tsx
import { ErrorExample } from '@/components/error-example';

// Em qualquer página
<ErrorExample />;
```

Este componente permite testar:

- Erros de autenticação
- Erros de rede
- Rate limits
- Timeouts
- Validações

## Conclusão

Com este sistema implementado, seu aplicativo agora:

- ✅ **Nunca quebra** para o usuário
- ✅ **Sempre mostra mensagens amigáveis**
- ✅ **Permite recuperação** de erros
- ✅ **Loga tudo** para monitoramento
- ✅ **É consistente** em toda a aplicação

O sistema é extensível e pode ser facilmente adaptado para suas necessidades específicas.
