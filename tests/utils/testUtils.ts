/**
 * Test Utilities
 * Common utilities for testing
 */

import { vi } from 'vitest';
import { randomUUID } from 'crypto';

/**
 * Wait for a specified amount of time
 * @param ms - Time to wait in milliseconds
 * @returns A promise that resolves after the specified time
 */
export const wait = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a random string
 * @param length - Length of the string
 * @returns A random string
 */
export const randomString = (length = 10): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a random email
 * @returns A random email
 */
export const randomEmail = (): string => 
  `${randomString(8)}@${randomString(5)}.com`;

/**
 * Mock console methods and restore them after tests
 * @returns Object with restore method
 */
export const mockConsole = () => {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };

  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
  console.debug = vi.fn();

  return {
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    },
    mocks: {
      log: console.log as unknown as vi.Mock,
      error: console.error as unknown as vi.Mock,
      warn: console.warn as unknown as vi.Mock,
      info: console.info as unknown as vi.Mock,
      debug: console.debug as unknown as vi.Mock,
    },
  };
};

/**
 * Create a mock environment with specified variables
 * @param envVars - Environment variables to set
 * @returns Object with restore method
 */
export const mockEnv = (envVars: Record<string, string>) => {
  const originalEnv = { ...process.env };
  
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  return {
    restore: () => {
      process.env = originalEnv;
    },
  };
};

/**
 * Create a spy on a method and restore it after tests
 * @param object - Object containing the method
 * @param method - Method name to spy on
 * @returns The spy
 */
export const createSpy = <T extends object, K extends keyof T>(
  object: T, 
  method: K
): vi.SpyInstance => {
  const spy = vi.spyOn(object, method);
  return spy;
};

/**
 * Assert that a function throws an error
 * @param fn - Function to test
 * @param errorType - Expected error type
 * @param message - Expected error message
 */
export const expectToThrow = async (
  fn: () => unknown | Promise<unknown>,
  errorType?: any,
  message?: string | RegExp
): Promise<void> => {
  let error: Error | null = null;
  
  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }
  
  // Import expect from vitest
  const { expect } = await import('vitest');
  
  expect(error).not.toBeNull();
  
  if (errorType) {
    expect(error).toBeInstanceOf(errorType);
  }
  
  if (message) {
    if (message instanceof RegExp) {
      expect(error?.message).toMatch(message);
    } else {
      expect(error?.message).toContain(message);
    }
  }
};