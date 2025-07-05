const fs = require('fs').promises;
const path = require('path');

// Lista de arquivos que precisam ser corrigidos
const filesToFix = [
  'app/api/mapa-assuntos/status/route.ts',
  'app/api/flashcards/route.ts',
  'app/api/flashcards/progress/route.ts',
  'app/api/example/route.ts',
  'app/api/estatisticas/route.ts',
  'app/api/apostilas/[slug]/modulos/route.ts',
  'app/api/apostilas/[slug]/progress/route.ts'
];

async function fixSupabaseClient(filePath) {
  try {
    console.log(`🔧 Corrigindo ${filePath}...`);
    
    let content = await fs.readFile(filePath, 'utf8');
    
    // Verificar se o arquivo precisa ser corrigido
    if (!content.includes('createRouteHandlerClient({ cookies: () => cookieStore })')) {
      console.log(`✅ ${filePath} já está correto ou não precisa de correção`);
      return false;
    }
    
    // Substituir import incorreto
    content = content.replace(
      /import { createRouteHandlerClient } from '@supabase\/auth-helpers-nextjs';/g,
      "import { createRouteHandlerClient } from '@/lib/supabase';"
    );
    
    // Remover import de cookies se não for usado em outro lugar
    if (!content.includes('cookies()') || content.match(/cookies\(\)/g)?.length === 1) {
      content = content.replace(/import { cookies } from 'next\/headers';?\n?/g, '');
    }
    
    // Substituir criação do cliente
    content = content.replace(
      /const cookieStore = cookies\(\);\s*const supabase = createRouteHandlerClient\(\{ cookies: \(\) => cookieStore \}\);/g,
      'const supabase = await createRouteHandlerClient();'
    );
    
    // Adicionar await se necessário
    if (content.includes('const supabase = createRouteHandlerClient();')) {
      content = content.replace(
        /const supabase = createRouteHandlerClient\(\);/g,
        'const supabase = await createRouteHandlerClient();'
      );
    }
    
    // Salvar arquivo corrigido
    await fs.writeFile(filePath, content);
    
    console.log(`✅ ${filePath} corrigido com sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao corrigir ${filePath}:`, error.message);
    return false;
  }
}

async function fixAllFiles() {
  console.log('🚀 Iniciando correção dos clientes Supabase...\n');
  
  let fixedCount = 0;
  let totalFiles = filesToFix.length;
  
  for (const filePath of filesToFix) {
    const wasFixed = await fixSupabaseClient(filePath);
    if (wasFixed) fixedCount++;
    console.log(''); // Linha em branco para separar
  }
  
  console.log('📊 Resumo da correção:');
  console.log(`✅ ${fixedCount}/${totalFiles} arquivos corrigidos`);
  
  if (fixedCount === totalFiles) {
    console.log('\n🎉 Todos os arquivos foram corrigidos com sucesso!');
    console.log('Agora o sistema deve funcionar sem erros de autenticação.');
  } else {
    console.log('\n⚠️  Alguns arquivos não foram corrigidos.');
    console.log('Verifique os logs acima para mais detalhes.');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixAllFiles().catch(console.error);
}

module.exports = { fixAllFiles, fixSupabaseClient }; 