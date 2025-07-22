/**
 * Arquivo de teste para verificar a configuração do eslint-plugin-vitest
 */
import { describe, it, expect, vi } from 'vitest';

describe('ESLint Vitest Plugin Test', () => {
  // Este teste deve passar normalmente
  it('should pass with proper expect usage', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(1, 2)).toBe(3);
  });

  // Este teste deve gerar um aviso do ESLint por usar toBe em vez de toHaveLength
  it('should warn about using toBe instead of toHaveLength', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3); // ESLint: prefer-to-have-length
  });

  // Este teste deve gerar um aviso do ESLint por usar toEqual em vez de toBe para tipos primitivos
  it('should warn about using toEqual instead of toBe for primitives', () => {
    const value = 42;
    expect(value).toEqual(42); // ESLint: prefer-to-be
  });

  // Este teste deve gerar um erro do ESLint por não ter expect
  it('should error for missing expect', () => {
    const value = 42;
    // Falta expect aqui - ESLint: expect-expect
  });

  // Este teste deve gerar um aviso do ESLint por estar desabilitado
  it.skip('should warn about disabled test', () => {
    expect(true).toBe(true);
  });
});