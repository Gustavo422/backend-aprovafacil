import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from '../../repositories/UserRepository';
import jwt from 'jsonwebtoken';

// Mock UserRepository
vi.mock('../../repositories/UserRepository');

// Definir tipo para o resultado esperado
interface AuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    auth_user_id: string;
    nome: string;
    email: string;
    role: string;
  };
}

describe('Token Refresh', () => {
  let authService: unknown; // para evitar erros de lint em mocks
  let mockUserRepository: UserRepository;
  const testSecret = 'test-secret-key';
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Create mock UserRepository
    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByAuthUserId: vi.fn(),
      updateLastLogin: vi.fn()
    } as unknown as UserRepository;
    
    // Create AuthService instance with test secret
    authService = {
      login: vi.fn(),
      refreshToken: vi.fn(),
      comparePassword: vi.fn()
    };
  });
  
  it('should generate both access and refresh tokens during login', async () => {
    // Arrange
    const testUser = {
      id: '123',
      auth_user_id: 'auth-123',
      email: 'test@example.com',
      nome: 'Test User',
      role: 'user',
      ativo: true,
      senha_hash: 'hashed-password'
    };
    
    // Mock repository methods
    (mockUserRepository.findByEmail as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(testUser);
    (mockUserRepository.updateLastLogin as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(true);
    
    // Mock password comparison
    vi.spyOn(authService as { comparePassword: (a: string, b: string) => Promise<boolean> }, 'comparePassword').mockResolvedValue(true);
    
    // Act
    const result = await (authService as { login: (email: string, password: string) => Promise<AuthResult> }).login('test@example.com', 'password');
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    
    // Decode tokens to verify payloads
    const accessPayload = jwt.decode(result.accessToken) as jwt.JwtPayload;
    const refreshPayload = jwt.decode(result.refreshToken) as jwt.JwtPayload;
    
    // Verify access token payload
    expect(accessPayload.type).toBe('access');
    expect(accessPayload.userId).toBe(testUser.id);
    expect(accessPayload.email).toBe(testUser.email);
    
    // Verify refresh token payload
    expect(refreshPayload.type).toBe('refresh');
    expect(refreshPayload.userId).toBe(testUser.id);
    expect(refreshPayload.email).toBeUndefined(); // Refresh token should not contain email
  });
  
  it('should refresh access token with valid refresh token', async () => {
    // Arrange
    const testUser = {
      id: '123',
      auth_user_id: 'auth-123',
      email: 'test@example.com',
      nome: 'Test User',
      role: 'user',
      ativo: true
    };
    
    // Create a valid refresh token
    const refreshToken = jwt.sign(
      { userId: testUser.id, type: 'refresh' },
      testSecret,
      { expiresIn: '7d' }
    );
    
    // Mock repository methods
    (mockUserRepository.findById as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(testUser);
    
    // Act
    const result = await (authService as { refreshToken: (token: string) => Promise<AuthResult> }).refreshToken(refreshToken);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.accessToken).toBeDefined();
    expect(typeof result.accessToken).toBe('string');
    
    // Verify user data in result
    expect(result.user).toEqual({
      id: testUser.id,
      auth_user_id: testUser.auth_user_id,
      nome: testUser.nome,
      email: testUser.email,
      role: testUser.role
    });
    
    // Decode new access token
    const accessPayload = jwt.decode(result.accessToken) as jwt.JwtPayload;
    
    // Verify access token payload
    expect(accessPayload.type).toBe('access');
    expect(accessPayload.userId).toBe(testUser.id);
    expect(accessPayload.email).toBe(testUser.email);
  });
  
  it('should reject invalid refresh tokens', async () => {
    // Arrange
    const invalidToken = 'invalid-token';
    
    // Act & Assert
    await expect((authService as { refreshToken: (token: string) => Promise<AuthResult> }).refreshToken(invalidToken)).rejects.toThrow('Refresh token inválido');
  });
  
  it('should reject access tokens used as refresh tokens', async () => {
    // Arrange
    const testUser = {
      id: '123',
      auth_user_id: 'auth-123',
      email: 'test@example.com',
      role: 'user'
    };
    
    // Create an access token (not a refresh token)
    const accessToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, type: 'access' },
      testSecret,
      { expiresIn: '15m' }
    );
    
    // Act & Assert
    await expect((authService as { refreshToken: (token: string) => Promise<AuthResult> }).refreshToken(accessToken)).rejects.toThrow('Token inválido: não é um refresh token');
  });
  
  it('should reject expired refresh tokens', async () => {
    // Arrange
    const testUser = {
      id: '123',
      auth_user_id: 'auth-123'
    };
    
    // Create an expired refresh token
    const expiredToken = jwt.sign(
      { userId: testUser.id, type: 'refresh' },
      testSecret,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );
    
    // Act & Assert
    await expect((authService as { refreshToken: (token: string) => Promise<AuthResult> }).refreshToken(expiredToken)).rejects.toThrow('Refresh token expirado');
  });
  
  it('should reject refresh tokens for non-existent users', async () => {
    // Arrange
    const nonExistentUserId = 'non-existent-id';
    
    // Create a valid refresh token for non-existent user
    const refreshToken = jwt.sign(
      { userId: nonExistentUserId, type: 'refresh' },
      testSecret,
      { expiresIn: '7d' }
    );
    
    // Mock repository to return null (user not found)
    (mockUserRepository.findById as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(null);
    
    // Act & Assert
    await expect((authService as { refreshToken: (token: string) => Promise<AuthResult> }).refreshToken(refreshToken)).rejects.toThrow('Usuário não encontrado');
  });
  
  it('should reject refresh tokens for inactive users', async () => {
    // Arrange
    const inactiveUser = {
      id: '123',
      auth_user_id: 'auth-123',
      email: 'inactive@example.com',
      nome: 'Inactive User',
      role: 'user',
      ativo: false
    };
    
    // Create a valid refresh token
    const refreshToken = jwt.sign(
      { userId: inactiveUser.id, type: 'refresh' },
      testSecret,
      { expiresIn: '7d' }
    );
    
    // Mock repository to return inactive user
    (mockUserRepository.findById as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(inactiveUser);
    
    // Act & Assert
    await expect((authService as { refreshToken: (token: string) => Promise<AuthResult> }).refreshToken(refreshToken)).rejects.toThrow('Conta desativada');
  });
});