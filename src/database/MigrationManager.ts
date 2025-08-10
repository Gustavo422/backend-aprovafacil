import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { Migration, MigrationRecord, MigrationResult, MigrationOptions } from './types.js';
import { MigrationStatus } from './types.js';

/**
 * Migration Manager class
 * Handles database migrations with version tracking and rollback functionality
 */
export class MigrationManager {
  private readonly client: SupabaseClient;
  private readonly migrationsDir: string;
  private readonly migrationTableName = 'migrations';
  private readonly logger: typeof console;

  /**
   * Constructor
   * @param client Supabase client
   * @param migrationsDir Directory containing migration files
   */
  constructor(client: SupabaseClient, migrationsDir: string) {
    this.client = client;
    this.migrationsDir = migrationsDir;
    this.logger = console;
  }

  /**
   * Initialize the migration system
   * Creates the migrations table if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      // Check if migrations table exists by trying to select from it
      const { error: checkError } = await this.client
        .from(this.migrationTableName)
        .select('id')
        .limit(1);

      // If the table doesn't exist, we'll get an error
      if (checkError?.message?.includes('does not exist')) {
        // Create migrations table using SQL
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${this.migrationTableName} (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            version INTEGER NOT NULL UNIQUE,
            status TEXT NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE,
            rolled_back_at TIMESTAMP WITH TIME ZONE,
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        
        // Tentar preferencialmente via RPC exec_sql; se indisponível, fazer fallback informativo
        let createErrorMessage: string | null = null;
        try {
          const { error } = await this.client.rpc('exec_sql', { sql: createTableSQL });
          if (error) {
            createErrorMessage = (error as unknown as { message?: string }).message ?? String(error);
          }
        } catch (e) {
          createErrorMessage = e instanceof Error ? e.message : String(e);
        }

        if (createErrorMessage) {
          // Fallback: não há como criar via REST (DDL). Informar claramente.
          throw new Error(`Failed to create migrations table: ${createErrorMessage}`);
        }
        
        this.logger.info('Migrations table created successfully');
      } else if (checkError) {
        throw new Error(`Failed to check migrations table: ${checkError.message}`);
      } else {
        this.logger.info('Migrations table already exists');
      }
    } catch (error) {
      this.logger.error('Failed to initialize migration system:', error);
      throw error;
    }
  }

  /**
   * Load all migration files from the migrations directory
   * @returns Array of Migration objects
   */
  async loadMigrations(): Promise<Migration[]> {
    try {
      const files = fs.readdirSync(this.migrationsDir);
      const migrationFiles = files.filter(file => file.endsWith('.sql'));
      
      const migrations: Migration[] = [];
      
      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Parse version and name from filename (format: V{version}__{name}.sql)
        const match = file.match(/^V(\d+)__(.+)\.sql$/);
        if (!match) {
          this.logger.warn(`Invalid migration filename format: ${file}. Expected format: V{version}__{name}.sql`);
          continue;
        }
        
        const version = parseInt(match?.[1] ?? '0', 10);
        const name = match?.[2] ?? '';
        
        migrations.push({
          version,
          name,
          up: content,
          down: '', // Migrations down not implemented yet
        });
      }
      
      // Sort migrations by version
      migrations.sort((a, b) => a.version - b.version);
      
      return Promise.resolve(migrations);
    } catch (error) {
      this.logger.error('Failed to load migrations:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Get applied migrations from the database
   * @returns Array of MigrationRecord objects
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      const { data, error } = await this.client
        .from(this.migrationTableName)
        .select('*')
        .order('version', { ascending: true });
      
      if (error) {
        throw new Error(`Failed to get applied migrations: ${error.message}`);
      }
      
      return data as MigrationRecord[];
    } catch (error) {
      this.logger.error('Failed to get applied migrations:', error);
      throw error;
    }
  }

  /**
   * Get pending migrations
   * @returns Array of Migration objects that haven't been applied yet
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const allMigrations = await this.loadMigrations();
    const appliedMigrations = await this.getAppliedMigrations();
    
    const appliedVersions = new Set(
      appliedMigrations
        .filter(m => m.status === MigrationStatus.APPLIED)
        .map(m => m.version),
    );
    
    return allMigrations.filter(migration => !appliedVersions.has(migration.version));
  }

  /**
   * Apply a single migration
   * @param migration Migration to apply
   * @param options Migration options
   * @returns MigrationResult
   */
  async applyMigration(migration: Migration, options: MigrationOptions = {}): Promise<MigrationResult> {
    const { dryRun = false, verbose = false } = options;
    
    try {
      if (verbose) {
        this.logger.info(`Applying migration ${migration.version}: ${migration.name}`);
        if (dryRun) {
          this.logger.info('DRY RUN - No changes will be made');
        }
      }
      
      if (!dryRun) {
        // Execute the migration
        try {
          await this.client.rpc('exec_sql', { sql: migration.up });
        } catch (error) {
          throw new Error(`Failed to apply migration: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Record the migration
        const { error: recordError } = await this.client
          .from(this.migrationTableName)
          .insert({
            id: uuidv4(),
            name: migration.name,
            version: migration.version,
            status: MigrationStatus.APPLIED,
            applied_at: new Date().toISOString(),
          });
        
        if (recordError) {
          throw new Error(`Failed to record migration: ${recordError.message}`);
        }
      }
      
      return { success: true, migration };
    } catch (error) {
      this.logger.error(`Failed to apply migration ${migration.version}:`, error);
      
      if (!dryRun) {
        // Record the failed migration
        await this.client
          .from(this.migrationTableName)
          .insert({
            id: uuidv4(),
            name: migration.name,
            version: migration.version,
            status: MigrationStatus.FAILED,
            error_message: error instanceof Error ? error.message : String(error),
          });
      }
      
      return { 
        success: false, 
        migration, 
        error: error instanceof Error ? error : new Error(String(error)), 
      };
    }
  }

  /**
   * Rollback a single migration
   * @param migration Migration to rollback
   * @param options Migration options
   * @returns MigrationResult
   */
  async rollbackMigration(migration: Migration, options: MigrationOptions = {}): Promise<MigrationResult> {
    const { dryRun = false, verbose = false } = options;
    
    try {
      if (verbose) {
        this.logger.info(`Rolling back migration ${migration.version}: ${migration.name}`);
        if (dryRun) {
          this.logger.info('DRY RUN - No changes will be made');
        }
      }
      
      if (!dryRun) {
        // Execute the rollback
        try {
          await this.client.rpc('exec_sql', { sql: migration.down });
        } catch (error) {
          throw new Error(`Failed to rollback migration: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Update the migration record
        const { error: updateError } = await this.client
          .from(this.migrationTableName)
          .update({
            status: MigrationStatus.ROLLED_BACK,
            rolled_back_at: new Date().toISOString(),
          })
          .eq('version', migration.version)
          .eq('status', MigrationStatus.APPLIED);
        
        if (updateError) {
          throw new Error(`Failed to update migration record: ${updateError.message}`);
        }
      }
      
      return { success: true, migration };
    } catch (error) {
      this.logger.error(`Failed to rollback migration ${migration.version}:`, error);
      return { 
        success: false, 
        migration, 
        error: error instanceof Error ? error : new Error(String(error)), 
      };
    }
  }

  /**
   * Apply all pending migrations
   * @param options Migration options
   * @returns Array of MigrationResult objects
   */
  async migrateUp(options: MigrationOptions = {}): Promise<MigrationResult[]> {
    const pendingMigrations = await this.getPendingMigrations();
    const results: MigrationResult[] = [];
    
    if (pendingMigrations.length === 0) {
      this.logger.info('No pending migrations to apply');
      return results;
    }
    
    this.logger.info(`Applying ${pendingMigrations.length} pending migrations...`);
    
    for (const migration of pendingMigrations) {
      const result = await this.applyMigration(migration, options);
      results.push(result);
      
      if (!result.success && !options.force) {
        this.logger.error('Migration failed, stopping migration process');
        break;
      }
    }
    
    return results;
  }

  /**
   * Rollback migrations
   * @param steps Number of migrations to rollback (default: 1)
   * @param options Migration options
   * @returns Array of MigrationResult objects
   */
  async migrateDown(steps = 1, options: MigrationOptions = {}): Promise<MigrationResult[]> {
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationsToRollback = appliedMigrations
      .filter(m => m.status === MigrationStatus.APPLIED)
      .sort((a, b) => b.version - a.version) // Sort in descending order
      .slice(0, steps);
    
    if (migrationsToRollback.length === 0) {
      this.logger.info('No migrations to rollback');
      return [];
    }
    
    this.logger.info(`Rolling back ${migrationsToRollback.length} migrations...`);
    
    const results: MigrationResult[] = [];
    const allMigrations = await this.loadMigrations();
    
    for (const migrationRecord of migrationsToRollback) {
      const migration = allMigrations.find(m => m.version === migrationRecord.version);
      
      if (!migration) {
        this.logger.error(`Migration file for version ${migrationRecord.version} not found`);
        continue;
      }
      
      const result = await this.rollbackMigration(migration, options);
      results.push(result);
      
      if (!result.success && !options.force) {
        this.logger.error('Rollback failed, stopping rollback process');
        break;
      }
    }
    
    return results;
  }

  /**
   * Get migration status
   * @returns Object with pending and applied migrations
   */
  async status(): Promise<{ pending: Migration[], applied: MigrationRecord[] }> {
    const allMigrations = await this.loadMigrations();
    const appliedMigrations = await this.getAppliedMigrations();
    
    const appliedVersions = new Set(
      appliedMigrations
        .filter(m => m.status === MigrationStatus.APPLIED)
        .map(m => m.version),
    );
    
    const pendingMigrations = allMigrations.filter(migration => !appliedVersions.has(migration.version));
    
    return {
      pending: pendingMigrations,
      applied: appliedMigrations,
    };
  }

  /**
   * Create a new migration file
   * @param name Migration name
   * @returns Path to the created migration file
   */
  createMigration(name: string): string {
    // Get the next version number
    const files = fs.readdirSync(this.migrationsDir);
    const versions = files
      .filter(file => file.match(/^V\d+__/))
      .map(file => {
        const match = file.match(/^V(\d+)__/);
        return match ? parseInt(match[1] ?? '0', 10) : 0;
      });
    
    const nextVersion = versions.length > 0 ? Math.max(...versions) + 1 : 1;
    const formattedName = name.replace(/\s+/g, '_').toLowerCase();
    const fileName = `V${nextVersion.toString().padStart(3, '0')}__${formattedName}.sql`;
    const filePath = path.join(this.migrationsDir, fileName);
    
    // Create migration file template
    const template = `-- UP
-- Migration SQL goes here

-- DOWN
-- Rollback SQL goes here
`;
    
    fs.writeFileSync(filePath, template, 'utf8');
    this.logger.info(`Created migration file: ${fileName}`);
    
    return filePath;
  }
}