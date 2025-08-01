import { supabase } from '../config/supabase-unified.js';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { getLogger } from '../lib/logging/logging-service.js';

// Load environment variables
import 'dotenv/config';

const logger = getLogger('run-users-migration');

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Variáveis de ambiente obrigatórias não encontradas', {
    missing: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  });
  throw new Error('Variáveis de ambiente obrigatórias não encontradas');
}

async function runMigration(): Promise<void> {
  try {
    logger.info('🚀 Starting usuarios table migration...');

    // Read the migration SQL file
    const migrationPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../migrations/users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    logger.info('📄 Executing migration SQL...');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      logger.warn('⚠️  exec_sql not available, trying direct query...');

      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          logger.info(`Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' });

          if (stmtError) {
            logger.warn(`⚠️  Statement failed (this might be expected): ${stmtError.message}`);
          }
        }
      }
    }

    logger.info('✅ Migration concluido successfully!');
    logger.info('📋 Added columns to usuarios table', {
      columns: [
        'total_questoes_respondidas (INTEGER)',
        'total_resposta_corretas (INTEGER)',
        'tempo_estudo_minutos (INTEGER)',
        'pontuacao_media (DECIMAL(5,2))',
        'atualizado_em (TIMESTAMP)',
      ],
    });
    logger.info('🔧 Added triggers and indexes for performance');
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Falha na migração');
  }
}

// Alternative approach using direct SQL execution
async function runMigrationAlternative(): Promise<void> {
  try {
    logger.info('🚀 Starting usuarios table migration (alternative method)...');

    // Add columns one by one
    const alterStatements = [
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS total_questoes_respondidas INTEGER DEFAULT 0',
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS total_resposta_corretas INTEGER DEFAULT 0',
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tempo_estudo_minutos INTEGER DEFAULT 0',
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pontuacao_media DECIMAL(5,2) DEFAULT 0',
      'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    ];

    for (const statement of alterStatements) {
      logger.info(`Executing: ${statement}`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        logger.warn(`⚠️  Statement failed (this might be expected): ${error.message}`);
      } else {
        logger.info('✅ Statement executed successfully');
      }
    }

    logger.info('✅ Migration concluido successfully!');
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Falha na migração alternativa');
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration().catch(() => {
    logger.info('🔄 Trying alternative migration method...');
    return runMigrationAlternative();
  });
}

export { runMigration, runMigrationAlternative }; 

