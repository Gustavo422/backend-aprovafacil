/**
 * Types for the database migration system
 */

/**
 * Migration status enum
 */
export enum MigrationStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

/**
 * Migration direction enum
 */
export enum MigrationDirection {
  UP = 'up',
  DOWN = 'down'
}

/**
 * Migration record interface
 */
export interface MigrationRecord {
  id: string;
  name: string;
  version: number;
  status: MigrationStatus;
  applied_at?: Date;
  rolled_back_at?: Date;
  error_message?: string;
}

/**
 * Migration interface
 */
export interface Migration {
  name: string;
  version: number;
  up: string;
  down: string;
}

/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean;
  migration: Migration;
  error?: Error;
}

/**
 * Migration options interface
 */
export interface MigrationOptions {
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
}