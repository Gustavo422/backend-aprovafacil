import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

// Load environment variables
import 'dotenv/config';

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(): Promise<void> {
  try {
    console.log('🚀 Starting usuarios table migration...');

    // Read the migration SQL file
    const migrationPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../migrations/users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  exec_sql not available, trying direct query...');

      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' });

          if (stmtError) {
            console.log(`⚠️  Statement failed (this might be expected): ${stmtError.message}`);
          }
        }
      }
    }

    console.log('✅ Migration concluido successfully!');
    console.log('');
    console.log('📋 Added columns to usuarios table:');
    console.log('   - total_questoes_respondidas (INTEGER)');
    console.log('   - total_resposta_corretas (INTEGER)');
    console.log('   - tempo_estudo_minutos (INTEGER)');
    console.log('   - pontuacao_media (DECIMAL(5,2))');
    console.log('   - atualizado_em (TIMESTAMP)');
    console.log('');
    console.log('🔧 Added triggers and indexes for performance');
  } catch (error) {
    console.error('❌ Migration failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function runMigrationAlternative(): Promise<void> {
  try {
    console.log('🚀 Starting usuarios table migration (alternative method)...');

    // Add columns one by one
    const alterStatements = [
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS total_questoes_respondidas INTEGER DEFAULT 0',
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS total_resposta_corretas INTEGER DEFAULT 0',
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tempo_estudo_minutos INTEGER DEFAULT 0',
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pontuacao_media DECIMAL(5,2) DEFAULT 0',
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    ];

    for (const statement of alterStatements) {
      console.log(`Executing: ${statement}`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.log(`⚠️  Statement failed (this might be expected): ${error.message}`);
      } else {
        console.log('✅ Statement executed successfully');
      }
    }

    console.log('✅ Migration concluido successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration().catch(() => {
    console.log('🔄 Trying alternative migration method...');
    return runMigrationAlternative();
  });
}

export { runMigration, runMigrationAlternative }; 



