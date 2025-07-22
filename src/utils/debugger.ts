/**
 * Sistema de debug avançado para o backend
 * 
 * Este módulo fornece uma interface completa para criar instâncias de debug com namespaces padronizados,
 * permitindo logs detalhados e categorizados durante o desenvolvimento, com integração ao sistema
 * de logging existente.
 * 
 * Baseado na biblioteca 'debug' (https://github.com/debug-js/debug)
 */

import debug from 'debug';
import { logger } from './logger.js';

/**
 * Prefixo base para todos os namespaces de debug do aplicativo
 */
const BASE_NAMESPACE = 'app:backend';

/**
 * Níveis de log suportados
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Interface para as opções de criação de um debugger
 */
export interface DebuggerOptions {
  /**
   * Indica se deve incluir o timestamp nos logs
   * @default true
   */
  includeTimestamp?: boolean;
  
  /**
   * Indica se deve integrar com o logger principal
   * @default true
   */
  integrateWithLogger?: boolean;
  
  /**
   * Nível de log padrão para integração com o logger
   * @default LogLevel.DEBUG
   */
  defaultLogLevel?: LogLevel;
  
  /**
   * Serviço a ser usado nos logs do logger principal
   * @default 'debug'
   */
  service?: string;
  
}

/**
 * Interface para uma função de debug
 */
export interface DebugFunction {
  (format: unknown, ...args: unknown[]): void;
  enabled: boolean;
  namespace: string;
  
  /**
   * Métodos adicionais para diferentes níveis de log
   */
  debug(format: unknown, ...args: unknown[]): void;
  info(format: unknown, ...args: unknown[]): void;
  warn(format: unknown, ...args: unknown[]): void;
  error(format: unknown, ...args: unknown[]): void;
  
  /**
   * Método para criar um sub-namespace
   */
  extend(namespace: string): DebugFunction;
}

/**
 * Cria uma instância de debug avançada com namespace padronizado e integração com o logger
 * 
 * @param namespace - O namespace específico para esta instância (será prefixado com BASE_NAMESPACE)
 * @param options - Opções de configuração para o debugger
 * @returns Uma função de debug configurada com métodos adicionais
 * 
 * @example
 * // Criar um debugger para o módulo de autenticação
 * const authDebug = createDebugger('auth');
 * authDebug('Usuário autenticado: %s', username);
 * authDebug.info('Login bem-sucedido');
 * authDebug.error('Falha na autenticação: %o', error);
 */
export function createDebugger(namespace: string, options: DebuggerOptions = {}): DebugFunction {
  const {
    includeTimestamp = true,
    integrateWithLogger = true,
    defaultLogLevel = LogLevel.DEBUG,
    service = 'debug',
  } = options;
  
  // Criar a instância base de debug
  const fullNamespace = `${BASE_NAMESPACE}:${namespace}`;
  const debugInstance = debug(fullNamespace);
  
  // Configurar cores (a propriedade useColors não está mais disponível na versão atual do debug)
  // As cores agora são controladas pela variável de ambiente NO_COLOR
  
  // Função principal de debug com métodos adicionais
  const enhancedDebug = function(format: unknown, ...args: unknown[]): void {
    // Chamar a função de debug original
    debugInstance(format, ...args);
    
    // Integrar com o logger principal se configurado
    if (integrateWithLogger && debugInstance.enabled) {
      try {
        import('util').then(util => {
          let formattedMessage: string;
          if (typeof format === 'string') {
            formattedMessage = util.format(format, ...args);
          } else {
            formattedMessage = util.format(format, ...args);
          }
          logger[defaultLogLevel](formattedMessage, `${service}:${namespace}`);
        }).catch(() => {
          logger[defaultLogLevel](String(format), `${service}:${namespace}`);
        });
      } catch {
        // Fallback se algo der errado na formatação
        logger[defaultLogLevel](String(format), `${service}:${namespace}`);
      }
    }
  } as DebugFunction;
  
  // Copiar propriedades da instância original
  enhancedDebug.enabled = debugInstance.enabled;
  enhancedDebug.namespace = debugInstance.namespace;
  
  // Adicionar método para criar sub-namespaces
  enhancedDebug.extend = function(subNamespace: string): DebugFunction {
    return createDebugger(`${namespace}:${subNamespace}`, options);
  };
  
  // Adicionar métodos para diferentes níveis de log
  enhancedDebug.debug = function(format: unknown, ...args: unknown[]): void {
    if (debugInstance.enabled) {
      const prefix = '\x1b[34m[DEBUG]\x1b[0m ';
      enhancedDebug(prefix + format, ...args);
      
      if (integrateWithLogger) {
        logger.debug(typeof format === 'string' ? format : String(format), `${service}:${namespace}`);
      }
    }
  };
  
  enhancedDebug.info = function(format: unknown, ...args: unknown[]): void {
    if (debugInstance.enabled) {
      const prefix = '\x1b[32m[INFO]\x1b[0m ';
      enhancedDebug(prefix + format, ...args);
      
      if (integrateWithLogger) {
        logger.info(typeof format === 'string' ? format : String(format), `${service}:${namespace}`);
      }
    }
  };
  
  enhancedDebug.warn = function(format: unknown, ...args: unknown[]): void {
    if (debugInstance.enabled) {
      const prefix = '\x1b[33m[WARN]\x1b[0m ';
      enhancedDebug(prefix + format, ...args);
      
      if (integrateWithLogger) {
        logger.warn(typeof format === 'string' ? format : String(format), `${service}:${namespace}`);
      }
    }
  };
  
  enhancedDebug.error = function(format: unknown, ...args: unknown[]): void {
    if (debugInstance.enabled) {
      const prefix = '\x1b[31m[ERROR]\x1b[0m ';
      enhancedDebug(prefix + format, ...args);
      
      if (integrateWithLogger) {
        logger.error(typeof format === 'string' ? format : String(format), `${service}:${namespace}`);
      }
    }
  };
  
  // Modificar o método de log para incluir timestamp se necessário
  if (includeTimestamp) {
    const originalLog = debugInstance.log;
    debugInstance.log = function(args: unknown, ...rest: unknown[]): void {
      const timestamp = new Date().toISOString();
      let msg = args;
      if (typeof args === 'string') {
        msg = `[${timestamp}] ${args}`;
      }
      originalLog.call(debugInstance, msg, ...rest);
    };
  }

  return enhancedDebug;
}