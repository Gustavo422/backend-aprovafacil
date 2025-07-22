/**
 * Script para verificar se o ESLint detecta corretamente os problemas nos arquivos de teste
 * 
 * Este script executa o ESLint nos arquivos de teste com problemas conhecidos e verifica
 * se todas as regras configuradas estão sendo detectadas corretamente.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Caminho para o arquivo de teste com problemas
const testFilePath = path.join(__dirname, 'eslint-vitest-rules.test.ts');

// Regras que devem ser detectadas
const expectedRules = [
  'vitest/no-identical-title',
  'vitest/no-disabled-tests',
  'vitest/no-focused-tests',
  'vitest/expect-expect',
  'vitest/valid-expect',
  'vitest/prefer-to-be',
  'vitest/prefer-to-have-length'
];

console.log('Verificando regras do ESLint para o backend...');
console.log(`Arquivo de teste: ${testFilePath}`);
console.log('Regras esperadas:');
expectedRules.forEach(rule => console.log(`- ${rule}`));

try {
  // Executar ESLint no arquivo de teste e capturar a saída
  const output = execSync(`npx eslint "${testFilePath}" --format json`, { encoding: 'utf8' });
  const results = JSON.parse(output);
  
  if (results.length === 0 || !results[0].messages || results[0].messages.length === 0) {
    console.error('❌ Erro: Nenhum problema foi detectado pelo ESLint.');
    process.exit(1);
  }
  
  // Extrair as regras detectadas
  const detectedRules = [...new Set(results[0].messages.map(msg => msg.ruleId))];
  
  console.log('\nRegras detectadas:');
  detectedRules.forEach(rule => console.log(`- ${rule}`));
  
  // Verificar se todas as regras esperadas foram detectadas
  const missingRules = expectedRules.filter(rule => !detectedRules.includes(rule));
  
  if (missingRules.length > 0) {
    console.error('\n❌ Erro: Algumas regras não foram detectadas:');
    missingRules.forEach(rule => console.error(`- ${rule}`));
    process.exit(1);
  }
  
  console.log('\n✅ Sucesso! Todas as regras foram detectadas corretamente.');
} catch (error) {
  console.error('\n❌ Erro ao executar o ESLint:');
  console.error(error.message);
  
  // Mesmo com erro, vamos verificar se as regras foram detectadas na saída
  try {
    const errorOutput = error.stdout.toString();
    let detectedRules = [];
    
    expectedRules.forEach(rule => {
      if (errorOutput.includes(rule)) {
        detectedRules.push(rule);
        console.log(`- Regra detectada: ${rule}`);
      }
    });
    
    const missingRules = expectedRules.filter(rule => !detectedRules.includes(rule));
    
    if (missingRules.length > 0) {
      console.error('\n❌ Algumas regras não foram detectadas:');
      missingRules.forEach(rule => console.error(`- ${rule}`));
      process.exit(1);
    } else {
      console.log('\n✅ Sucesso! Todas as regras foram detectadas na saída de erro.');
    }
  } catch (parseError) {
    console.error('Não foi possível analisar a saída de erro.');
    process.exit(1);
  }
}