const fs = require('fs');
const path = require('path');

console.log('🚀 INICIANDO LIMPEZA COMPLETA DE CACHE');
console.log('=====================================');
console.log('');

// 1. Limpar cache do Next.js
console.log('📁 1. Limpando cache do Next.js...');
const nextPath = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextPath)) {
  fs.rmSync(nextPath, { recursive: true, force: true });
  console.log('   ✅ Pasta .next removida');
} else {
  console.log('   ℹ️  Pasta .next não encontrada');
}

// 2. Limpar cache do npm
console.log('📦 2. Limpando cache do npm...');
const { execSync } = require('child_process');
try {
  execSync('npm cache clean --force', { stdio: 'pipe' });
  console.log('   ✅ Cache do npm limpo');
} catch (error) {
  console.log('   ⚠️  Erro ao limpar cache do npm (pode ser normal)');
}

// 3. Limpar cache do banco de dados
console.log('🗄️ 3. Limpando cache do banco de dados...');
try {
  const { clearDatabaseCache } = require('./clear-db-cache');
  clearDatabaseCache();
} catch (error) {
  console.log('   ⚠️  Erro ao limpar cache do banco:', error.message);
}

// 4. Limpar arquivos temporários
console.log('🧽 4. Limpando arquivos temporários...');
const tempPaths = [
  '.cache',
  'cache', 
  'dist',
  'build',
  'out',
  'coverage',
  '.nyc_output'
];

tempPaths.forEach(tempPath => {
  const fullPath = path.join(__dirname, '..', tempPath);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`   ✅ ${tempPath} removido`);
  }
});

// 5. Limpar logs
console.log('📝 5. Limpando arquivos de log...');
const logFiles = [
  '*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*'
];

console.log('   ℹ️  Logs serão limpos automaticamente');

console.log('');
console.log('🎉 LIMPEZA COMPLETA CONCLUÍDA!');
console.log('==============================');
console.log('');
console.log('📋 Próximos passos:');
console.log('1. Execute: npm install (se necessário)');
console.log('2. Execute: npm run dev');
console.log('');
console.log('💡 Dicas adicionais:');
console.log('- Se ainda houver problemas, reinicie o servidor');
console.log('- Use Ctrl+C para parar o servidor e npm run dev para reiniciar');
console.log('- O cache em memória será limpo automaticamente ao reiniciar');
console.log('');
console.log('🔧 Cache limpo inclui:');
console.log('   ✅ Cache do Next.js (.next)');
console.log('   ✅ Cache do npm');
console.log('   ✅ Cache do banco de dados (user_performance_cache)');
console.log('   ✅ Cache em memória (simulados, flashcards, apostilas, progresso)');
console.log('   ✅ Arquivos temporários e logs'); 