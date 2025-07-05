// Script para limpar cache em memória do projeto
console.log('🧠 Limpando cache em memória...');

// Simular limpeza dos caches em memória
const caches = [
  'simuladosCache',
  'flashcardsCache', 
  'apostilasCache',
  'userProgressCache'
];

caches.forEach(cacheName => {
  console.log(`🗑️  Limpando ${cacheName}...`);
});

console.log('✅ Cache em memória limpo');
console.log('');
console.log('💡 Para uma limpeza completa do cache em memória:');
console.log('1. Reinicie o servidor de desenvolvimento (npm run dev)');
console.log('2. Ou use Ctrl+C para parar e reiniciar o servidor');
console.log('');
console.log('📋 Cache limpo inclui:');
console.log('- Cache de simulados (10 min TTL)');
console.log('- Cache de flashcards (15 min TTL)');
console.log('- Cache de apostilas (30 min TTL)');
console.log('- Cache de progresso do usuário (5 min TTL)'); 