require('dotenv').config();

console.log('🔍 Verificando JWT_SECRET...');
console.log('📏 Comprimento:', process.env.JWT_SECRET?.length);
console.log('🔤 Começa com aspas:', process.env.JWT_SECRET?.startsWith('"'));
console.log('🔤 Termina com aspas:', process.env.JWT_SECRET?.endsWith('"'));
console.log('📄 Valor completo:', process.env.JWT_SECRET); 