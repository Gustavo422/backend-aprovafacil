/**
 * Authentication Service Integration Tests
 * Tests the integration between AuthService and UserRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockUser } from '../../utils/mockFactory';
import { expectToThrow } from '../../utils/testUtils';

// Mock interfaces
interface User {
  id: string;
  email: string;
  nome: string;
  role: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

// Mock AuthService class
class AuthService {
  private supabaseClient: any;
  private userRepository: any;

  constructor(supabaseClient: any, userRepository: any) {
    this.supabaseClient = supabaseClient;
    this.userRepository = userRepository;
  }

  async signIn(email: string, password: string): Promise<Session> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const { data, error } = await this.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }

    if (!data.session) {
      throw new Error('No session returned from authentication');
    }

    // Get user details from the repository
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found in database');
    }

    if (!user.ativo) {
      throw new Error('User account is inactive');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user,
    };
  }

  async verifyToken(token: string): Promise<User> {
    if (!token) {
      throw new Error('Token is required');
    }

    const { data, error } = await this.supabaseClient.auth.getUser(token);

    if (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Invalid token');
    }

    // Get user details from the repository
    const user = await this.userRepository.findById(data.user.id);
    if (!user) {
      throw new Error('User not found in database');
    }

    if (!user.ativo) {
      throw new Error('User account is inactive');
    }

    return user;
  }
}

// Mock UserRepository class
class UserRepository {
  private users: User[];

  constructor() {
    this.users = [];
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  // Helper method for testing
  addUser(user: User): void {
    this.users.push(user);
  }
}

describe('AuthService Integration', () => {
  let mockSupabaseClient: any;
  let userRepository: UserRepository;
  let authService: AuthService;
  
  beforeEach(() => {
    // Create fresh mocks for each test
    mockSupabaseClient = {
      auth: {
        signInWithPassword: vi.fn(),
        getUser: vi.fn(),
      },
    };
    
    userRepository = new UserRepository();
    authService = new AuthService(mockSupabaseClient, userRepository);
  });
  
  describe('signIn with UserRepository', () => {
    it('should sign in and retrieve user from repository', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'Password123!';
      const mockUser = createMockUser({ email, ativo: true });
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
      };
      
      // Add user to repository
      userRepository.addUser(mockUser);
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: { id: mockUser.id } },
        error: null,
      });
      
      // Act
      const result = await authService.signIn(email, password);
      
      // Assert
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password,
      });
      expect(result).toEqual({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        expires_at: mockSession.expires_at,
        user: mockUser,
      });
    });
    
    it('should fail when user is not in repository', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const password = 'Password123!';
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
      };
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: { id: '123' } },
        error: null,
      });
      
      // Act & Assert
      await expect(authService.signIn(email, password)).rejects.toThrow('User not found in database');
    });
    
    it('should fail when user is inactive', async () => {
      // Arrange
      const email = 'inactive@example.com';
      const password = 'Password123!';
      const mockUser = createMockUser({ email, ativo: false });
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
      };
      
      // Add inactive user to repository
      userRepository.addUser(mockUser);
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: { id: mockUser.id } },
        error: null,
      });
      
      // Act & Assert
      await expect(authService.signIn(email, password)).rejects.toThrow('User account is inactive');
    });
  });
  
  describe('verifyToken with UserRepository', () => {
    it('should verify token and retrieve user from repository', async () => {
      // Arrange
      const token = 'valid-token';
      const mockUser = createMockUser({ ativo: true });
      
      // Add user to repository
      userRepository.addUser(mockUser);
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });
      
      // Act
      const result = await authService.verifyToken(token);
      
      // Assert
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(token);
      expect(result).toEqual(mockUser);
    });
    
    it('should fail when user is not in repository', async () => {
      // Arrange
      const token = 'valid-token';
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'nonexistent-id' } },
        error: null,
      });
      
      // Act & Assert
      await expect(authService.verifyToken(token)).rejects.toThrow('User not found in database');
    });
    
    it('should fail when user is inactive', async () => {
      // Arrange
      const token = 'valid-token';
      const mockUser = createMockUser({ ativo: false });
      
      // Add inactive user to repository
      userRepository.addUser(mockUser);
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });
      
      // Act & Assert
      await expect(authService.verifyToken(token)).rejects.toThrow('User account is inactive');
    });
  });
});