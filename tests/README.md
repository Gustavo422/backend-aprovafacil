# Testing Framework

This directory contains the testing framework for the backend application. The tests are written using Vitest, a fast and feature-rich testing framework.

## Directory Structure

```
tests/
├── README.md                 # This file
├── setup.ts                  # Global test setup
├── utils/                    # Test utilities
│   ├── mockFactory.ts        # Factory functions for creating test mocks
│   └── testUtils.ts          # Common test utilities
├── repositories/             # Repository tests
│   └── baseRepository.test.ts # Tests for the base repository
├── services/                 # Service tests
│   └── baseService.test.ts   # Tests for the base service
├── supabase/                 # Supabase-related tests
│   └── supabaseClient.test.ts # Tests for the Supabase client
└── ... other test files
```

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run
```

## Writing Tests

### Test File Naming

Test files should be named with the `.test.ts` or `.spec.ts` extension. For example, if you're testing a file called `userRepository.ts`, the test file should be named `userRepository.test.ts`.

### Test Structure

Tests should follow the Arrange-Act-Assert (AAA) pattern:

```typescript
describe('MyClass', () => {
  describe('myMethod', () => {
    it('should do something', () => {
      // Arrange
      const myClass = new MyClass();
      const input = 'test';
      
      // Act
      const result = myClass.myMethod(input);
      
      // Assert
      expect(result).toBe('expected result');
    });
  });
});
```

### Mocking

Use the mock factory functions in `utils/mockFactory.ts` to create mock objects for your tests:

```typescript
import { createMockRepository, createMockUser } from '../utils/mockFactory';

describe('UserService', () => {
  let mockRepository;
  let service;
  
  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new UserService(mockRepository);
  });
  
  it('should create a user', async () => {
    const user = createMockUser();
    mockRepository.create.mockResolvedValue(user);
    
    const result = await service.create(user);
    
    expect(mockRepository.create).toHaveBeenCalledWith(user);
    expect(result).toEqual(user);
  });
});
```

### Testing Asynchronous Code

Use `async/await` for testing asynchronous code:

```typescript
it('should fetch data asynchronously', async () => {
  const result = await myAsyncFunction();
  expect(result).toBe('expected result');
});
```

### Testing Errors

Use `expect().rejects.toThrow()` for testing that a function throws an error:

```typescript
it('should throw an error', async () => {
  await expect(myFunctionThatThrows()).rejects.toThrow('Expected error message');
});
```

Or use the `expectToThrow` utility:

```typescript
import { expectToThrow } from '../utils/testUtils';

it('should throw an error', async () => {
  await expectToThrow(
    () => myFunctionThatThrows(),
    Error,
    'Expected error message'
  );
});
```

## Best Practices

1. **Test in isolation**: Each test should be independent of other tests.
2. **Mock external dependencies**: Use mocks for external dependencies like databases, APIs, etc.
3. **Test edge cases**: Test both the happy path and edge cases.
4. **Keep tests simple**: Each test should test one thing.
5. **Use descriptive test names**: Test names should describe what the test is testing.
6. **Clean up after tests**: Use `afterEach` or `afterAll` to clean up resources.
7. **Don't test implementation details**: Test behavior, not implementation.
8. **Use test coverage**: Aim for high test coverage, but don't sacrifice test quality for coverage.

## Mocking Supabase

The `createMockSupabaseClient` function in `utils/mockFactory.ts` provides a mock Supabase client that you can use in your tests. You can customize the mock responses for different methods:

```typescript
import { createMockSupabaseClient } from '../utils/mockFactory';

const mockSupabase = createMockSupabaseClient({
  then: { data: [{ id: '123', name: 'Test' }], error: null },
});

// Use the mock Supabase client in your tests
const repository = new MyRepository(mockSupabase);
```