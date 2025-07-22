# Testes para Verificar as Regras do ESLint Plugin Vitest

Este diretório contém arquivos para verificar se as regras do `eslint-plugin-vitest` estão configuradas corretamente e detectando problemas nos testes.

## Arquivos

- `eslint-vitest-rules.test.ts`: Arquivo de teste com problemas conhecidos que violam as regras do `eslint-plugin-vitest`.
- `verify-eslint-rules.js`: Script para verificar se o ESLint detecta corretamente os problemas no arquivo de teste.

## Como Usar

Para verificar se as regras do ESLint estão funcionando corretamente:

```bash
node tests/eslint-vitest-rules/verify-eslint-rules.js
```

## Regras Verificadas

O arquivo de teste contém exemplos de código que violam as seguintes regras:

- `vitest/no-identical-title`: Detecta títulos de teste duplicados
- `vitest/no-disabled-tests`: Alerta sobre testes desativados (it.skip, describe.skip)
- `vitest/no-focused-tests`: Impede testes focados (it.only, describe.only)
- `vitest/expect-expect`: Garante que cada teste tenha pelo menos uma asserção
- `vitest/valid-expect`: Garante que expect() seja usado corretamente
- `vitest/prefer-to-be`: Sugere usar toBe() em vez de toEqual() para tipos primitivos
- `vitest/prefer-to-have-length`: Sugere usar toHaveLength() em vez de verificar a propriedade length

## Notas

- Este arquivo de teste NÃO deve ser executado como parte dos testes normais, pois contém código intencionalmente problemático.
- O objetivo é apenas verificar se o ESLint detecta corretamente os problemas.