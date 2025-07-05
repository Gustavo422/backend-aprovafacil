# Guia de Testes do AprovaFacil Backend

## Configuração de Testes

O projeto utiliza o [Vitest](https://vitest.dev/) como framework de testes. A configuração está definida no arquivo `vitest.config.ts`.

## Executando Testes

### Testes Básicos

Para executar todos os testes uma única vez:

```bash
npm test
```

Para executar os testes em modo de observação (watch mode):

```bash
npm run test:watch
```

### Cobertura de Código

Para gerar relatórios de cobertura de código:

```bash
npm run test:coverage
```

Os relatórios de cobertura são gerados em formato HTML, JSON e texto no console. Você pode encontrar os relatórios HTML na pasta `coverage/` após a execução do comando.

## Estrutura de Testes

Os testes devem ser organizados seguindo a estrutura do projeto:

```
src/
  ├── api/
  │   └── users/
  │       ├── route.ts
  │       └── route.test.ts  # Testes para a rota de usuários
  ├── features/
  │   └── auth/
  │       ├── service.ts
  │       └── service.test.ts  # Testes para o serviço de autenticação
  └── utils/
      ├── formatter.ts
      └── formatter.test.ts  # Testes para utilitários
```

### Exemplos de Testes

O projeto inclui exemplos de diferentes tipos de testes em `src/examples/`:

- **Testes Unitários**: `example.test.ts` - Demonstra testes básicos com mocks
- **Testes de Integração**: `integration.test.ts` - Mostra como testar a interação entre componentes
- **Testes de API**: `api.test.ts` - Exemplifica testes de serviços de API
- **Testes de Componentes**: `component.test.ts` - Ilustra testes de componentes com injeção de dependências

## Tipos de Testes

### Testes Unitários

Testam funções e classes isoladamente, mockando dependências externas.

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('formatCurrency', () => {
  it('deve formatar valor em reais corretamente', () => {
    // Arrange
    const value = 1234.56;
    
    // Act
    const result = formatCurrency(value, 'BRL');
    
    // Assert
    expect(result).toBe('R$ 1.234,56');
  });
});
```

### Testes de Integração

Testam a interação entre diferentes partes do sistema.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('UserService com Database', () => {
  let service;
  let db;
  
  beforeEach(async () => {
    db = new TestDatabase();
    await db.connect();
    service = new UserService(db);
  });
  
  it('deve salvar e recuperar usuário', async () => {
    // Arrange
    const user = { name: 'Test User', email: 'test@example.com' };
    
    // Act
    await service.createUser(user);
    const result = await service.getUserByEmail(user.email);
    
    // Assert
    expect(result.name).toBe(user.name);
  });
});
```

### Testes de API

Testam endpoints de API, geralmente com mocks para chamadas HTTP.

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('API de Usuários', () => {
  it('GET /api/users deve retornar lista de usuários', async () => {
    // Arrange (setup do mock)
    const mockResponse = [{ id: 1, name: 'User 1' }];
    vi.spyOn(httpClient, 'get').mockResolvedValue(mockResponse);
    
    // Act
    const result = await apiService.getUsers();
    
    // Assert
    expect(result).toEqual(mockResponse);
  });
});
```

## Solução de Problemas

### Erro de Permissão (EACCES)

Se você encontrar erros de permissão (EACCES) ao executar os testes, tente:

1. Executar o terminal como administrador
2. Verificar se não há outros processos usando as mesmas portas
3. Reiniciar o computador para liberar recursos do sistema

### Problemas com o Provider de Cobertura

Se houver problemas com o provider de cobertura, verifique se a dependência `@vitest/coverage-v8` está instalada corretamente:

```bash
npm install --save-dev @vitest/coverage-v8
```

### Testes Não Encontrados

Se os testes não estiverem sendo encontrados, verifique se os arquivos de teste seguem o padrão de nomenclatura correto:

- `*.test.ts`
- `*.test.js`
- `*.spec.ts`
- `*.spec.js`

## Melhores Práticas

### Estrutura de Testes

1. **Organize por Funcionalidade**: Mantenha os testes próximos ao código que estão testando
2. **Nomeie Descritivamente**: Use nomes claros para descrever o que está sendo testado
3. **Siga o Padrão AAA**: Arrange (preparação), Act (ação), Assert (verificação)

### Escrevendo Testes Eficazes

1. **Teste Comportamentos, Não Implementações**: Foque no que o código deve fazer, não em como faz
2. **Isolamento**: Cada teste deve ser independente e não depender de outros testes
3. **Mocks Apropriados**: Use mocks para isolar o código sendo testado de suas dependências
4. **Cobertura Significativa**: Busque cobrir casos de uso reais, não apenas linhas de código
5. **Testes de Borda**: Inclua testes para casos extremos e condições de erro

### Evitando Problemas Comuns

1. **Testes Frágeis**: Evite testes que quebram com pequenas mudanças no código
2. **Testes Lentos**: Mantenha os testes rápidos para feedback imediato
3. **Dependências Externas**: Minimize dependências de serviços externos nos testes unitários

## Ferramentas Úteis do Vitest

### Snapshots

Úteis para testar estruturas de dados complexas ou componentes:

```typescript
it('deve gerar estrutura de dados correta', () => {
  const result = generateComplexData();
  expect(result).toMatchSnapshot();
});
```

### Mocks de Tempo

Para testar código que depende de temporizadores:

```typescript
import { vi } from 'vitest';

it('deve chamar callback após timeout', () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  
  setTimeout(callback, 1000);
  
  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
  
  vi.useRealTimers();
});
```

## Limitações Conhecidas

- **Interface Visual (UI)**: Devido a problemas de permissão no Windows, a interface visual do Vitest (vitest --ui) foi desativada. Use os comandos `test` e `test:watch` para executar os testes.
- **Testes em Paralelo**: Para evitar problemas de permissão, os testes são executados em um único thread. Isso pode afetar o desempenho em projetos maiores.

## Recursos Adicionais

- [Documentação oficial do Vitest](https://vitest.dev/guide/)
- [Guia de asserções do Vitest](https://vitest.dev/api/expect.html)
- [Melhores práticas de testes](https://github.com/goldbergyoni/javascript-testing-best-practices)