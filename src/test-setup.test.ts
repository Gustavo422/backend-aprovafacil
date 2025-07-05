import { describe, it, expect } from 'vitest';

describe('Teste de configuração do Vitest', () => {
  it('deve verificar se o ambiente de teste está funcionando', () => {
    expect(1 + 1).toBe(2);
  });

  it('deve verificar se as asserções funcionam corretamente', () => {
    const obj = { a: 1, b: 2 };
    expect(obj).toEqual({ a: 1, b: 2 });
  });

  it('deve verificar se as promessas funcionam corretamente', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});