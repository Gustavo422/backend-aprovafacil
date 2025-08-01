import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routeFiles = [
  'src/api/flashcards/route.ts',
  'src/api/questoes-semanais/route.ts',
  'src/api/plano-estudos/route.ts',
  'src/api/mapa-assuntos/route.ts',
  'src/api/concurso-categorias/route.ts',
  'src/api/categoria-disciplinas/route.ts',
  'src/api/estatisticas/route.ts',
  'src/api/user/route.ts',
  'src/api/user/auth-test/route.ts',
  'src/api/auth/token-debug/route.ts',
  'src/api/dashboard/enhanced-stats/route.ts',
  'src/api/dashboard/activities/route.ts',
  'src/api/dashboard/stats/route.ts',
  'src/api/conteudo/filtrado/route.ts',
  'src/api/concursos/route.ts',
];

const routerTemplate = `

// Criar router Express
import { Router } from 'express';

const router = Router();

// Registrar rotas
// TODO: Adicionar rotas específicas para cada arquivo

export { router };
`;

routeFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Verificar se já tem router
    if (!content.includes('export { router }')) {
      fs.appendFileSync(fullPath, routerTemplate);
      console.log(`✅ Router adicionado a ${filePath}`);
    } else {
      console.log(`⏭️  Router já existe em ${filePath}`);
    }
  } else {
    console.log(`❌ Arquivo não encontrado: ${filePath}`);
  }
});

console.log('\n🎯 Script concluído! Agora você precisa adicionar as rotas específicas em cada arquivo.'); 