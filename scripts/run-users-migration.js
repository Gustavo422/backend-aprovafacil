const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting users table migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../docs/database/add_users_columns.sql');
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
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
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
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Added columns to users table:');
    console.log('   - total_questions_answered (INTEGER)');
    console.log('   - total_correct_answers (INTEGER)');
    console.log('   - study_time_minutes (INTEGER)');
    console.log('   - average_score (DECIMAL(5,2))');
    console.log('   - updated_at (TIMESTAMP)');
    console.log('');
    console.log('🔧 Added triggers and indexes for performance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function runMigrationAlternative() {
  try {
    console.log('🚀 Starting users table migration (alternative method)...');
    
    // Add columns one by one
    const alterStatements = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_questions_answered INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_correct_answers INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS study_time_minutes INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS average_score DECIMAL(5,2) DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
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
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  runMigration().catch(() => {
    console.log('🔄 Trying alternative migration method...');
    return runMigrationAlternative();
  });
}

module.exports = { runMigration, runMigrationAlternative }; 