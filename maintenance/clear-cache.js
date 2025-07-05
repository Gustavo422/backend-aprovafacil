const fs = require('fs');
const path = require('path');

console.log('🧹 Limpando cache do projeto...');

// 1. Limpar pasta .next
const nextPath = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextPath)) {
  console.log('📁 Removendo pasta .next...');
  fs.rmSync(nextPath, { recursive: true, force: true });
  console.log('✅ Pasta .next removida');
} else {
  console.log('ℹ️  Pasta .next não encontrada');
}

// 2. Limpar node_modules (opcional - descomente se necessário)
// const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
// if (fs.existsSync(nodeModulesPath)) {
//   console.log('📦 Removendo node_modules...');
//   fs.rmSync(nodeModulesPath, { recursive: true, force: true });
//   console.log('✅ node_modules removida');
// }

// 3. Limpar arquivos de cache do sistema
const cachePaths = [
  path.join(__dirname, '..', '.cache'),
  path.join(__dirname, '..', 'cache'),
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', 'build'),
  path.join(__dirname, '..', 'out'),
];

cachePaths.forEach(cachePath => {
  if (fs.existsSync(cachePath)) {
    console.log(`🗑️  Removendo ${path.basename(cachePath)}...`);
    fs.rmSync(cachePath, { recursive: true, force: true });
    console.log(`✅ ${path.basename(cachePath)} removido`);
  }
});

// 4. Limpar arquivos temporários
const tempFiles = [
  '*.log',
  '*.tmp',
  '*.temp',
  '.DS_Store',
  'Thumbs.db'
];

console.log('🧽 Limpeza concluída!');
console.log('');
console.log('📋 Próximos passos:');
console.log('1. Execute: npm install (se necessário)');
console.log('2. Execute: npm run dev');
console.log('');
console.log('💡 Dica: Se ainda houver problemas, tente:');
console.log('   - npm cache clean --force');
console.log('   - rm -rf node_modules && npm install'); 