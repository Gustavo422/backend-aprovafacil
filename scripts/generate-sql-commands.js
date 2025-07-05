const fs = require('fs').promises;
const path = require('path');

async function generateSQLCommands() {
  console.log('📝 Gerando comandos SQL para execução manual...\n');
  
  // Lista de arquivos SQL na ordem de execução
  const sqlFiles = [
    { path: 'clean_database.sql', name: '1. Limpeza do Banco' },
    { path: 'database_schema.sql', name: '2. Schema do Banco' },
    { path: 'prepare_restructure.sql', name: '3. Reestruturação' },
    { path: 'add_triggers_and_indexes.sql', name: '4. Triggers e Índices' },
    { path: 'sample_data.sql', name: '5. Dados de Exemplo' }
  ];
  
  let allSQL = '';
  
  for (const file of sqlFiles) {
    try {
      console.log(`📖 Lendo ${file.name}...`);
      const sqlContent = await fs.readFile(file.path, 'utf8');
      
      allSQL += `\n-- ========================================\n`;
      allSQL += `-- ${file.name}\n`;
      allSQL += `-- ========================================\n\n`;
      allSQL += sqlContent;
      allSQL += `\n\n`;
      
      console.log(`✅ ${file.name} lido com sucesso!`);
    } catch (error) {
      console.error(`❌ Erro ao ler ${file.path}:`, error.message);
    }
  }
  
  // Salvar arquivo combinado
  const outputPath = 'database_setup_complete.sql';
  await fs.writeFile(outputPath, allSQL);
  
  console.log(`\n📄 Arquivo combinado salvo como: ${outputPath}`);
  console.log('\n🚀 INSTRUÇÕES PARA EXECUTAR:');
  console.log('1. Acesse o Supabase Dashboard');
  console.log('2. Vá para SQL Editor');
  console.log('3. Abra o arquivo database_setup_complete.sql');
  console.log('4. Copie todo o conteúdo');
  console.log('5. Cole no SQL Editor do Supabase');
  console.log('6. Clique em "Run" para executar');
  console.log('\n⚠️  IMPORTANTE: Execute em um banco de teste primeiro!');
  
  return outputPath;
}

// Executar se chamado diretamente
if (require.main === module) {
  generateSQLCommands().catch(console.error);
}

module.exports = { generateSQLCommands }; 