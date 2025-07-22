/**
 * Testes para o utilitário de debug
 * 
 * Este arquivo contém testes para verificar o funcionamento correto da biblioteca debug
 * e sua integração com o sistema de logging do backend.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import debug from 'debug';
import { 
  createDebugger, 
  createModuleDebugger, 
  enableAllDebug, 
  disableAllDebug, 
  getEnabledNamespaces,
  LogLevel
} from '../../src/utils/debugger.js';

// Mock do módulo logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock do console.log para capturar saídas
const originalConsoleLog = console.log;
let consoleOutput: any[] = [];

describe('Utilitário de Debug', () => {
  beforeEach(() => {
    // Limpar mocks antes de cada teste
    vi.clearAllMocks();
    
    // Mock do console.log para capturar saídas
    consoleOutput = [];
    console.log = vi.fn((...args) => {
      consoleOutput.push(args);
    });
    
    // Garantir que o debug está desativado antes de cada teste
    disableAllDebug();
  });
  
  afterEach(() => {
    // Restaurar console.log original
    console.log = originalConsoleLog;
  });
  
  describe('Criação de instâncias de debug', () => {
    it('deve criar uma instância de debug com namespace correto', () => {
      const testDebug = createDebugger('test');
      expect(testDebug.namespace).toBe('app:backend:test');
    });
    
    it('deve criar uma instância de debug para um módulo específico', () => {
      const moduleDebug = createModuleDebugger('service', 'user');
      expect(moduleDebug.namespace).toBe('app:backend:service:user');
    });
    
    it('deve permitir a criação de sub-namespaces', () => {
      const testDebug = createDebugger('test');
      const subDebug = testDebug.extend('sub');
      expect(subDebug.namespace).toBe('app:backend:test:sub');
    });
  });
  
  describe('Ativação e desativação de categorias', () => {
    it('deve ativar todos os namespaces do aplicativo', () => {
      enableAllDebug();
      const testDebug = createDebugger('test');
      expect(testDebug.enabled).toBe(true);
    });
    
    it('deve desativar todos os namespaces do aplicativo', () => {
      // Primeiro ativa
      enableAllDebug();
      
      // Depois desativa
      disableAllDebug();
      
      const testDebug = createDebugger('test');
      expect(testDebug.enabled).toBe(false);
    });
    
    it('deve retornar os namespaces atualmente habilitados', () => {
      // Ativa um namespace específico
      debug.enable('app:backend:test:*');
      
      const namespaces = getEnabledNamespaces();
      expect(namespaces).toContain('app:backend:test:*');
    });
    
    it('deve respeitar a ativação seletiva de namespaces', () => {
      // Ativa apenas um namespace específico
      debug.enable('app:backend:test:*');
      
      const testDebug = createDebugger('test');
      const otherDebug = createDebugger('other');
      
      expect(testDebug.enabled).toBe(true);
      expect(otherDebug.enabled).toBe(false);
    });
  });
  
  describe('Níveis de log', () => {
    beforeEach(() => {
      // Ativar debug para os testes
      enableAllDebug();
    });
    
    it('deve registrar logs com nível debug', () => {
      const { logger } = require('../../src/utils/logger.js');
      const testDebug = createDebugger('test');
      
      testDebug.debug('Mensagem de teste');
      
      expect(logger.debug).toHaveBeenCalled();
      expect(consoleOutput.length).toBeGreaterThan(0);
    });
    
    it('deve registrar logs com nível info', () => {
      const { logger } = require('../../src/utils/logger.js');
      const testDebug = createDebugger('test');
      
      testDebug.info('Mensagem de teste');
      
      expect(logger.info).toHaveBeenCalled();
      expect(consoleOutput.length).toBeGreaterThan(0);
    });
    
    it('deve registrar logs com nível warn', () => {
      const { logger } = require('../../src/utils/logger.js');
      const testDebug = createDebugger('test');
      
      testDebug.warn('Mensagem de teste');
      
      expect(logger.warn).toHaveBeenCalled();
      expect(consoleOutput.length).toBeGreaterThan(0);
    });
    
    it('deve registrar logs com nível error', () => {
      const { logger } = require('../../src/utils/logger.js');
      const testDebug = createDebugger('test');
      
      testDebug.error('Mensagem de teste');
      
      expect(logger.error).toHaveBeenCalled();
      expect(consoleOutput.length).toBeGreaterThan(0);
    });
  });
  
  describe('Comportamento quando desativado', () => {
    beforeEach(() => {
      // Garantir que o debug está desativado
      disableAllDebug();
    });
    
    it('não deve registrar logs quando o debug está desativado', () => {
      const { logger } = require('../../src/utils/logger.js');
      const testDebug = createDebugger('test');
      
      testDebug('Mensagem de teste');
      testDebug.debug('Mensagem de teste');
      testDebug.info('Mensagem de teste');
      testDebug.warn('Mensagem de teste');
      testDebug.error('Mensagem de teste');
      
      expect(logger.debug).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(consoleOutput.length).toBe(0);
    });
  });
  
  describe('Opções de configuração', () => {
    beforeEach(() => {
      // Ativar debug para os testes
      enableAllDebug();
    });
    
    it('deve respeitar a opção integrateWithLogger', () => {
      const { logger } = require('../../src/utils/logger.js');
      const testDebug = createDebugger('test', { integrateWithLogger: false });
      
      testDebug.debug('Mensagem de teste');
      
      expect(logger.debug).not.toHaveBeenCalled();
      expect(consoleOutput.length).toBeGreaterThan(0);
    });
    
    it('deve respeitar a opção defaultLogLevel', () => {
      const { logger } = require('../../src/utils/logger.js');
      const testDebug = createDebugger('test', { defaultLogLevel: LogLevel.INFO });
      
      testDebug('Mensagem de teste');
      
      expect(logger.info).toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });
    
    it('deve respeitar a opção service', () => {
      const { logger } = require('../../src/utils/logger.js');
      const testDebug = createDebugger('test', { service: 'custom-service' });
      
      testDebug.debug('Mensagem de teste');
      
      expect(logger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('custom-service')
      );
    });
  });
});