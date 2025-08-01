import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routeFiles = [
  'src/api/categoria-disciplinas/route.ts',
  'src/api/onboarding/route.ts',
  'src/api/estatisticas/route.ts',
  'src/api/dashboard/enhanced-stats/route.ts',
  'src/api/conteudo/filtrado/route.ts',
  'src/api/concurso-categorias/route.ts',
  'src/api/concursos/api/concursos/route.ts',
  'src/api/admin/security/route.ts',
  'src/api/admin/clear-cache/route.ts',
  'src/api/admin/benchmarks/route.ts',
];

routeFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Remover export default router
    content = content.replace(/export default router;\s*\n\s*\n\s*\n\s*\n\s*\n\s*\/\/ Criar router Express\s*\nimport \{ Router \} from 'express';\s*\n\s*const router = Router\(\);\s*\n\s*\/\/ Registrar rotas\s*\/\/ TODO: Adicionar rotas específicas para cada arquivo\s*\n\s*export \{ router \};/g, '// Registrar rotas\n// TODO: Adicionar rotas específicas para cada arquivo\n\nexport { router };');
    
    // Remover apenas o export default router se não houver o padrão completo
    content = content.replace(/export default router;\s*\n/g, '');
    
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Router corrigido em ${filePath}`);
  } else {
    console.log(`❌ Arquivo não encontrado: ${filePath}`);
  }
});

console.log('\n🎯 Script de correção concluído!'); 