/**
 * Arquivo de teste com problemas conhecidos para verificar as regras do eslint-plugin-vitest
 * 
 * Este arquivo contém exemplos de código que violam as regras configuradas do eslint-plugin-vitest.
 * O objetivo é verificar se o ESLint detecta corretamente esses problemas.
 * 
 * IMPORTANTE: Este arquivo NÃO deve ser executado como parte dos testes normais.
 * Ele serve apenas para verificar a detecção de problemas pelo ESLint.
 */

import { describe, it, expect, vi } from 'vitest';

// Regra: vitest/no-identical-title
// Problema: Títulos de teste duplicados
describe('Títulos duplicados', () => {
  it('este título está duplicado', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('este título está duplicado', () => {
    expect(2 + 2).toBe(4);
  });
});

// Regra: vitest/no-disabled-tests
// Problema: Testes desativados
describe.skip('Teste desativado', () => {
  it('este teste está em um describe desativado', () => {
    expect(true).toBe(true);
  });
});

it.skip('Este teste está desativado', () => {
  expect(true).toBe(true);
});

// Regra: vitest/no-focused-tests
// Problema: Testes focados
describe.only('Teste focado', () => {
  it('este teste está em um describe focado', () => {
    expect(true).toBe(true);
  });
});

it.only('Este teste está focado', () => {
  expect(true).toBe(true);
});

// Regra: vitest/expect-expect
// Problema: Teste sem asserção
it('teste sem asserção', () => {
  const resultado = 1 + 1;
  // Falta o expect()
});

// Regra: vitest/valid-expect
// Problema: Uso inválido de expect
it('uso inválido de expect', () => {
  expect();
});

// Regra: vitest/prefer-to-be
// Problema: Uso de toEqual para tipos primitivos
it('deve usar toBe em vez de toEqual para primitivos', () => {
  expect(1).toEqual(1); // Deveria usar toBe
  expect('string').toEqual('string'); // Deveria usar toBe
  expect(true).toEqual(true); // Deveria usar toBe
});

// Regra: vitest/prefer-to-have-length
// Problema: Verificação manual de length
it('deve usar toHaveLength', () => {
  const array = [1, 2, 3];
  expect(array.length).toBe(3); // Deveria usar toHaveLength
});