/**
 * Utilitário para debug de performance
 * 
 * Este módulo fornece funções para medir e registrar o tempo de execução
 * de operações, ajudando a identificar gargalos de performance.
 */

import { createDebugger } from './debugger.js';
import { DEBUG_CONFIG } from '../config/debug.js';
import { performance } from 'perf_hooks';

/**
 * Interface para as opções de medição de performance
 */
interface PerformanceMeasureOptions {
  /**
   * Nome da operação sendo medida
   */
  name: string;
  
  /**
   * Categoria da operação (api, database, service, etc.)
   */
  category: 'api' | 'database' | 'service' | 'auth' | 'cache' | string;
  
  /**
   * Limiar em ms para considerar a operação lenta
   */
  threshold?: number;
  
  /**
   * Detalhes adicionais sobre a operação
   */
  details?: Record<string, unknown>;
}

// Type for function with any parameters
type AnyFunction = (...args: unknown[]) => unknown;

// Criar debugger específico para performance
const performanceDebug = createDebugger('performance');

/**
 * Mede o tempo de execução de uma função assíncrona
 * 
 * @param fn - Função assíncrona a ser executada
 * @param options - Opções de medição
 * @returns O resultado da função
 * 
 * @example
 * // Medir o tempo de uma consulta ao banco de dados
 * const users = await measureAsync(
 *   () => userRepository.findAll(),
 *   { name: 'findAllUsers', category: 'database' }
 * );
 */
export async function measureAsync<T>(
  fn: () => Promise<T>,
  options: PerformanceMeasureOptions
): Promise<T> {
  const { name, category, details } = options;
  const threshold = options.threshold || DEBUG_CONFIG.performanceThreshold[category] || 100;
  
  performanceDebug(`Iniciando operação: ${name} [${category}]`);
  
  const startTime = performance.now();
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - startTime);
    
    logPerformance(name, duration, category, threshold, details);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    performanceDebug.error(
      `Erro na operação ${name} após ${duration}ms: %o`, 
      error
    );
    throw error;
  }
}

/**
 * Mede o tempo de execução de uma função síncrona
 * 
 * @param fn - Função síncrona a ser executada
 * @param options - Opções de medição
 * @returns O resultado da função
 * 
 * @example
 * // Medir o tempo de processamento de dados
 * const result = measure(
 *   () => processData(rawData),
 *   { name: 'processUserData', category: 'service' }
 * );
 */
export function measure<T>(
  fn: () => T,
  options: PerformanceMeasureOptions
): T {
  const { name, category, details } = options;
  const threshold = options.threshold || DEBUG_CONFIG.performanceThreshold[category] || 100;
  
  performanceDebug(`Iniciando operação: ${name} [${category}]`);
  
  const startTime = performance.now();
  try {
    const result = fn();
    const duration = Math.round(performance.now() - startTime);
    
    logPerformance(name, duration, category, threshold, details);
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    performanceDebug.error(
      `Erro na operação ${name} após ${duration}ms: %o`, 
      error
    );
    throw error;
  }
}

/**
 * Cria um wrapper de medição de performance para um objeto
 * 
 * @param target - Objeto a ser instrumentado
 * @param category - Categoria das operações
 * @param methodsToWrap - Lista de métodos a serem instrumentados (opcional, todos os métodos se não especificado)
 * @returns Uma cópia do objeto com os métodos instrumentados
 * 
 * @example
 * // Instrumentar um repositório
 * const monitoredRepo = wrapWithPerformance(userRepository, 'database');
 * 
 * // Usar normalmente
 * const users = await monitoredRepo.findAll();
 */
export function wrapWithPerformance<T extends object>(
  target: T,
  category: string,
  methodsToWrap?: (keyof T)[]
): T {
  const result = { ...target };
  const methods = methodsToWrap || Object.getOwnPropertyNames(Object.getPrototypeOf(target)) as (keyof T)[];
  
  for (const method of methods) {
    const originalMethod = target[method];
    if (typeof originalMethod === 'function') {
      result[method] = function(...args: Parameters<AnyFunction>) {
        const methodName = String(method);
        const options: PerformanceMeasureOptions = {
          name: `${target.constructor.name}.${methodName}`,
          category,
          details: { args: args.length > 0 ? `${args.length} arguments` : 'no arguments' }
        };
        
        if (originalMethod.constructor.name === 'AsyncFunction') {
          return measureAsync(() => originalMethod.apply(target, args), options);
        } else {
          return measure(() => originalMethod.apply(target, args), options);
        }
      } as typeof originalMethod;
    }
  }
  
  return result;
}

/**
 * Registra informações de performance
 */
function logPerformance(
  name: string,
  duration: number,
  category: string,
  threshold: number,
  details?: Record<string, unknown>
): void {
  const logDetails = {
    duration,
    category,
    ...details
  };
  
  if (duration > threshold) {
    performanceDebug.warn(
      `Operação lenta: ${name} [${category}] - ${duration}ms (limite: ${threshold}ms)`,
      logDetails
    );
  } else {
    performanceDebug.info(
      `Operação concluída: ${name} [${category}] - ${duration}ms`,
      logDetails
    );
  }
}