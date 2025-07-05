// Teste de exemplo para validar o setup do Vitest
import { describe, it, expect } from 'vitest';

function sum(a: number, b: number) {
  return a + b;
}

describe('sum', () => {
  it('soma dois números corretamente', () => {
    expect(sum(2, 3)).toBe(5);
  });
});
