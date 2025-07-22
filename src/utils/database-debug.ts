/**
 * Utilitário para debug de operações de banco de dados
 * 
 * Este módulo fornece funções para registrar detalhes de operações de banco de dados,
 * facilitando o debug de problemas relacionados ao acesso a dados.
 */

import { createDebugger } from './debugger.js';
import { measureAsync } from './performance-debug.js';
import { DEBUG_CONFIG } from '../config/debug.js';

// Criar debugger específico para banco de dados
const dbDebug = createDebugger('database');

/**
 * Interface para as opções de debug de banco de dados
 */
interface DatabaseDebugOptions {
  /**
   * Nome da operação
   */
  operation: string;
  
  /**
   * Nome da tabela ou coleção
   */
  table?: string;
  
  /**
   * Parâmetros da consulta
   */
  params?: Record<string, unknown>;
  
  /**
   * Consulta SQL ou equivalente
   */
  query?: string;
  
  /**
   * Limiar em ms para considerar a operação lenta
   */
  threshold?: number;
}

/**
 * Executa uma operação de banco de dados com debug
 * 
 * @param fn - Função assíncrona que executa a operação
 * @param options - Opções de debug
 * @returns O resultado da operação
 * 
 * @example
 * // Executar uma consulta com debug
 * const users = await executeWithDebug(
 *   () => db.query('SELECT * FROM users WHERE active = $1', [true]),
 *   { 
 *     operation: 'findActiveUsers',
 *     table: 'users',
 *     query: 'SELECT * FROM users WHERE active = $1',
 *     params: { active: true }
 *   }
 * );
 */
export async function executeWithDebug<T>(
  fn: () => Promise<T>,
  options: DatabaseDebugOptions
): Promise<T> {
  const { operation, table, params, query } = options;
  const threshold = options.threshold || DEBUG_CONFIG.performanceThreshold.database;
  
  // Registrar início da operação
  dbDebug.info(`Iniciando operação '${operation}'${table ? ` na tabela '${table}'` : ''}`);
  
  // Registrar detalhes da consulta se debug estiver habilitado
  if (dbDebug.enabled) {
    if (query) {
      dbDebug(`Consulta: ${query}`);
    }
    
    if (params) {
      dbDebug(`Parâmetros: %o`, sanitizeParams(params));
    }
  }
  
  // Executar a operação com medição de performance
  try {
    const result = await measureAsync(fn, {
      name: operation,
      category: 'database',
      threshold,
      details: { table, query: query?.substring(0, 100) }
    });
    
    // Registrar sucesso
    const resultInfo = getResultInfo(result);
    dbDebug.info(`Operação '${operation}' concluída com sucesso: ${resultInfo}`);
    
    return result;
  } catch (error) {
    // Registrar erro
    dbDebug.error(`Erro na operação '${operation}': %o`, error);
    throw error;
  }
}

/**
 * Obtém informações resumidas sobre o resultado
 */
function getResultInfo(result: unknown): string {
  if (!result) {
    return 'sem resultados';
  }
  
  if (Array.isArray(result)) {
    return `${result.length} registros`;
  }
  
  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>;
    if ('rowCount' in obj) {
      return `${obj.rowCount as number} registros afetados`;
    }
    
    if ('count' in obj) {
      return `${obj.count as number} registros`;
    }
    
    if ('id' in obj) {
      return `registro com id ${obj.id}`;
    }
    
    return '1 registro';
  }
  
  return String(result);
}

/**
 * Remove informações sensíveis dos parâmetros
 */
function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...params };
  
  // Remover ou mascarar campos sensíveis
  const sensitiveFields = ['password', 'senha', 'token', 'secret', 'apiKey', 'api_key'];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Cria um wrapper de debug para um repositório
 * 
 * @param repository - Repositório a ser instrumentado
 * @param tableName - Nome da tabela associada ao repositório
 * @returns Uma cópia do repositório com os métodos instrumentados
 * 
 * @example
 * // Instrumentar um repositório
 * const debugUserRepo = wrapRepositoryWithDebug(userRepository, 'users');
 * 
 * // Usar normalmente
 * const users = await debugUserRepo.findAll();
 */
export function wrapRepositoryWithDebug<T extends object>(repository: T, tableName: string): T {
  const result = { ...repository };
  const prototype = Object.getPrototypeOf(repository);
  const methods = Object.getOwnPropertyNames(prototype).filter(name => name !== 'constructor');
  
  for (const methodName of methods) {
    const originalMethod = repository[methodName as keyof T];
    if (typeof originalMethod === 'function') {
      result[methodName as keyof T] = async function(...args: unknown[]) {
        return executeWithDebug(
          () => originalMethod.apply(repository, args),
          {
            operation: `${repository.constructor.name}.${methodName}`,
            table: tableName,
            params: args.length > 0 ? { args } : undefined
          }
        );
      } as T[keyof T];
    }
  }
  
  return result;
}