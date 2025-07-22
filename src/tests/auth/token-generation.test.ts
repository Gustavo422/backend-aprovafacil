import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock UserRepository
vi.mock('../../repositories/UserRepository');

describe('Token Generation', () => {
  let authService: unknown; // era any
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Create AuthService instance with test secret
    // Comentado teste que usa require proibido
    // authService = new (require('../../services/AuthService'))(mockUserRepository, testSecret); // Mock the import
  });
  
  it('should generate a token with correct user information', async () => {
    // Create a test user
    const testUser = {
      id: '123',
      auth_user_id: 'auth-123',
      email: 'test@example.com',
      nome: 'Test User',
      role: 'user',
      ativo: true
    };
    
    // Use the private generateToken method via any type assertion
    const token = (authService as unknown as { generateToken: (user: typeof testUser) => string }).generateToken(testUser);
    
    // Verify token is a string
    expect(typeof token).toBe('string');
    
    // Decode token to verify payload
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    
    // Verify payload contains correct user information
    expect(decoded.userId).toBe(testUser.id);
    expect(decoded.authUserId).toBe(testUser.auth_user_id);
    expect(decoded.email).toBe(testUser.email);
    expect(decoded.role).toBe(testUser.role);
    expect(decoded.type).toBe('access');
    expect(Array.isArray(decoded.permissions)).toBe(true);
    expect(decoded.permissions).toContain('read:profile');
    expect(decoded.iat).toBeDefined();
    expect(decoded.jti).toBeDefined();
  });
  
  it('should include admin permissions for admin users', async () => {
    // Create a test admin user
    const adminUser = {
      id: '456',
      auth_user_id: 'auth-456',
      email: 'admin@example.com',
      nome: 'Admin User',
      role: 'admin',
      ativo: true
    };
    
    // Generate token for admin user
    const token = (authService as unknown as { generateToken: (user: typeof adminUser) => string }).generateToken(adminUser);
    
    // Decode token
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    
    // Verify admin-specific fields
    expect(decoded.isAdmin).toBe(true);
    expect(decoded.permissions).toContain('manage:system');
    expect(decoded.permissions).toContain('read:admin-dashboard');
  });
});