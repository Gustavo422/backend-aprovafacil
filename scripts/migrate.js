#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MigrationManager } from '../src/database/MigrationManager.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../src/database/migrations');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const options = {
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  verbose: args.includes('--verbose') || args.includes('-v')
};

// Validate Supabase environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create migration manager
const migrationManager = new MigrationManager(supabase, migrationsDir);

// Run the appropriate command
async function run() {
  try {
    await migrationManager.initialize();
    
    switch (command) {
      case 'up':
        console.log('Running migrations...');
        const upResults = await migrationManager.migrateUp(options);
        
        if (upResults.length === 0) {
          console.log('No migrations to apply');
        } else {
          const successful = upResults.filter(r => r.success).length;
          const failed = upResults.filter(r => !r.success).length;
          
          console.log(`Applied ${successful} migrations successfully`);
          if (failed > 0) {
            console.error(`Failed to apply ${failed} migrations`);
            process.exit(1);
          }
        }
        break;
        
      case 'down':
        const steps = parseInt(args[1], 10) || 1;
        console.log(`Rolling back ${steps} migration(s)...`);
        const downResults = await migrationManager.migrateDown(steps, options);
        
        if (downResults.length === 0) {
          console.log('No migrations to roll back');
        } else {
          const successful = downResults.filter(r => r.success).length;
          const failed = downResults.filter(r => !r.success).length;
          
          console.log(`Rolled back ${successful} migrations successfully`);
          if (failed > 0) {
            console.error(`Failed to roll back ${failed} migrations`);
            process.exit(1);
          }
        }
        break;
        
      case 'status':
        const status = await migrationManager.status();
        
        console.log('Migration Status:');
        console.log('=================');
        
        console.log('\nApplied Migrations:');
        if (status.applied.length === 0) {
          console.log('  No migrations applied yet');
        } else {
          status.applied.forEach(migration => {
            console.log(`  [${migration.status}] V${migration.version} - ${migration.name}`);
          });
        }
        
        console.log('\nPending Migrations:');
        if (status.pending.length === 0) {
          console.log('  No pending migrations');
        } else {
          status.pending.forEach(migration => {
            console.log(`  V${migration.version} - ${migration.name}`);
          });
        }
        break;
        
      case 'create':
        const name = args.slice(1).join(' ');
        if (!name) {
          console.error('Error: Migration name is required');
          console.log('Usage: npm run migrate create <migration-name>');
          process.exit(1);
        }
        
        const filePath = migrationManager.createMigration(name);
        console.log(`Created migration file: ${filePath}`);
        break;
        
      default:
        console.log(`
Migration CLI

Usage:
  npm run migrate up [options]            Apply all pending migrations
  npm run migrate down [steps] [options]  Roll back migrations (default: 1)
  npm run migrate status                  Show migration status
  npm run migrate create <name>           Create a new migration

Options:
  --dry-run  Show what would be done without making changes
  --force    Continue even if a migration fails
  -v, --verbose  Show more detailed output
`);
        break;
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

run();