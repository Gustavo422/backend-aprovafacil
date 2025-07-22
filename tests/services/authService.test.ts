/**
 * Authentication Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockUser } from '../utils/mockFactory';
import { expectToThrow } from '../utils/testUtils';

// Mock the auth service class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { AuthService } from '../../src/services/AuthService';

// Define User interface
interface User {
  id: string;
  email: string;
  nome: string;
  role: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Define Session interface
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

  async signUp(email: string, password: string, userData: Partial<User>): Promise<User> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!this.isStrongPassword(password)) {
      throw new Error('Password does not meet security requirements');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create auth user
    const { data, error } = await this.supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('No user returned from registration');
    }

    // Create user in database
    const newUser = await this.userRepository.create({
      id: data.user.id,
      email,
      nome: userData.nome || email.split('@')[0],
      role: userData.role || 'user',
      ativo: true,
    });

    return newUser;
  }

  async signOut(accessToken: string): Promise<void> {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    const { error } = await this.supabaseClient.auth.signOut({
      accessToken,
    });

    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  async refreshSession(refreshToken: string): Promise<Session> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const { data, error } = await this.supabaseClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new Error(`Session refresh failed: ${error.message}`);
    }

    if (!data.session) {
      throw new Error('No session returned from refresh');
    }

    // Get user details from the repository
    const user = await this.userRepository.findById(data.user.id);
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

  async resetPassword(email: string): Promise<void> {
    if (!email) {
      throw new Error('Email is required');
    }

    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    const { error } = await this.supabaseClient.auth.resetPasswordForEmail(email);

    if (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
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

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isStrongPassword(password: string): boolean {
    // Password must be at least 8 characters long and contain at least one uppercase letter,
    // one lowercase letter, one number, and one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
}

describe('AuthService', () => {
  let mockSupabaseClient: any;
  let mockUserRepository: any;
  let service: AuthService;
  
  beforeEach(() => {
    // Create fresh mocks for each test
    mockSupabaseClient = {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        getUser: vi.fn(),
      },
    };
    
    mockUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    };
    
    service = new AuthService(mockSupabaseClient, mockUserRepository);
  });
  
  describe('signIn', () => {
    it('should sign in a user successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'Password123!';
      const mockUser = createMockUser({ email, ativo: true });
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
      };
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: { id: mockUser.id } },
        error: null,
      });
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      
      // Act
      const result = await service.signIn(email, password);
      
      // Assert
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password,
      });
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        expires_at: mockSession.expires_at,
        user: mockUser,
      });
    });
    
    it('should validate required fields', async () => {
      // Arrange
      const email = '';
      const password = 'Password123!';
      
      // Act & Assert
      await expect(service.signIn(email, password)).rejects.toThrow('Email and password are required');
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });
    
    it('should handle authentication errors', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'WrongPassword123!';
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      });
      
      // Act & Assert
      await expect(service.signIn(email, password)).rejects.toThrow('Authentication failed: Invalid login credentials');
    });
    
    it('should handle missing session', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'Password123!';
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      
      // Act & Assert
      await expect(service.signIn(email, password)).rejects.toThrow('No session returned from authentication');
    });
    
    it('should handle user not found in database', async () => {
      // Arrange
      const email = 'test@example.com';
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
      
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.signIn(email, password)).rejects.toThrow('User not found in database');
    });
    
    it('should handle inactive user account', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'Password123!';
      const mockUser = createMockUser({ email, ativo: false });
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
      };
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: { id: mockUser.id } },
        error: null,
      });
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      
      // Act & Assert
      await expect(service.signIn(email, password)).rejects.toThrow('User account is inactive');
    });
  });
  
  describe('signUp', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'Password123!';
      const userData = { nome: 'New User' };
      const mockUser = createMockUser({ email, nome: userData.nome });
      
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });
      
      mockUserRepository.create.mockResolvedValue(mockUser);
      
      // Act
      const result = await service.signUp(email, password, userData);
      
      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email,
        password,
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        id: mockUser.id,
        email,
        nome: userData.nome,
        role: 'user',
        ativo: true,
      });
      expect(result).toEqual(mockUser);
    });
    
    it('should validate required fields', async () => {
      // Arrange
      const email = '';
      const password = 'Password123!';
      const userData = { nome: 'New User' };
      
      // Act & Assert
      await expect(service.signUp(email, password, userData)).rejects.toThrow('Email and password are required');
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });
    
    it('should validate email format', async () => {
      // Arrange
      const email = 'invalid-email';
      const password = 'Password123!';
      const userData = { nome: 'New User' };
      
      // Act & Assert
      await expect(service.signUp(email, password, userData)).rejects.toThrow('Invalid email format');
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });
    
    it('should validate password strength', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'weakpassword';
      const userData = { nome: 'New User' };
      
      // Act & Assert
      await expect(service.signUp(email, password, userData)).rejects.toThrow('Password does not meet security requirements');
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });
    
    it('should check for existing user', async () => {
      // Arrange
      const email = 'existing@example.com';
      const password = 'Password123!';
      const userData = { nome: 'Existing User' };
      const existingUser = createMockUser({ email });
      
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      
      // Act & Assert
      await expect(service.signUp(email, password, userData)).rejects.toThrow('User with this email already exists');
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });
    
    it('should handle registration errors', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'Password123!';
      const userData = { nome: 'New User' };
      
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Registration failed' },
      });
      
      // Act & Assert
      await expect(service.signUp(email, password, userData)).rejects.toThrow('Registration failed: Registration failed');
    });
    
    it('should handle missing user from registration', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'Password123!';
      const userData = { nome: 'New User' };
      
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      
      // Act & Assert
      await expect(service.signUp(email, password, userData)).rejects.toThrow('No user returned from registration');
    });
    
    it('should use default values when not provided', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'Password123!';
      const userData = {};
      const mockUser = createMockUser({ email, nome: 'newuser' });
      
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });
      
      mockUserRepository.create.mockResolvedValue(mockUser);
      
      // Act
      await service.signUp(email, password, userData);
      
      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        id: mockUser.id,
        email,
        nome: 'newuser',
        role: 'user',
        ativo: true,
      });
    });
  });
  
  describe('signOut', () => {
    it('should sign out a user successfully', async () => {
      // Arrange
      const accessToken = 'mock-access-token';
      
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });
      
      // Act
      await service.signOut(accessToken);
      
      // Assert
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledWith({
        accessToken,
      });
    });
    
    it('should validate required fields', async () => {
      // Arrange
      const accessToken = '';
      
      // Act & Assert
      await expect(service.signOut(accessToken)).rejects.toThrow('Access token is required');
      expect(mockSupabaseClient.auth.signOut).not.toHaveBeenCalled();
    });
    
    it('should handle sign out errors', async () => {
      // Arrange
      const accessToken = 'mock-access-token';
      
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });
      
      // Act & Assert
      await expect(service.signOut(accessToken)).rejects.toThrow('Sign out failed: Sign out failed');
    });
  });
  
  describe('refreshSession', () => {
    it('should refresh a session successfully', async () => {
      // Arrange
      const refreshToken = 'mock-refresh-token';
      const mockUser = createMockUser({ ativo: true });
      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Date.now() + 3600000,
      };
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession, user: { id: mockUser.id } },
        error: null,
      });
      
      mockUserRepository.findById.mockResolvedValue(mockUser);
      
      // Act
      const result = await service.refreshSession(refreshToken);
      
      // Assert
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: refreshToken,
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        expires_at: mockSession.expires_at,
        user: mockUser,
      });
    });
    
    it('should validate required fields', async () => {
      // Arrange
      const refreshToken = '';
      
      // Act & Assert
      await expect(service.refreshSession(refreshToken)).rejects.toThrow('Refresh token is required');
      expect(mockSupabaseClient.auth.refreshSession).not.toHaveBeenCalled();
    });
    
    it('should handle refresh errors', async () => {
      // Arrange
      const refreshToken = 'mock-refresh-token';
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' },
      });
      
      // Act & Assert
      await expect(service.refreshSession(refreshToken)).rejects.toThrow('Session refresh failed: Invalid refresh token');
    });
    
    it('should handle missing session', async () => {
      // Arrange
      const refreshToken = 'mock-refresh-token';
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      
      // Act & Assert
      await expect(service.refreshSession(refreshToken)).rejects.toThrow('No session returned from refresh');
    });
    
    it('should handle user not found in database', async () => {
      // Arrange
      const refreshToken = 'mock-refresh-token';
      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Date.now() + 3600000,
      };
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession, user: { id: '123' } },
        error: null,
      });
      
      mockUserRepository.findById.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.refreshSession(refreshToken)).rejects.toThrow('User not found in database');
    });
    
    it('should handle inactive user account', async () => {
      // Arrange
      const refreshToken = 'mock-refresh-token';
      const mockUser = createMockUser({ ativo: false });
      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Date.now() + 3600000,
      };
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession, user: { id: mockUser.id } },
        error: null,
      });
      
      mockUserRepository.findById.mockResolvedValue(mockUser);
      
      // Act & Assert
      await expect(service.refreshSession(refreshToken)).rejects.toThrow('User account is inactive');
    });
  });
  
  describe('resetPassword', () => {
    it('should request password reset successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });
      
      // Act
      await service.resetPassword(email);
      
      // Assert
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(email);
    });
    
    it('should validate required fields', async () => {
      // Arrange
      const email = '';
      
      // Act & Assert
      await expect(service.resetPassword(email)).rejects.toThrow('Email is required');
      expect(mockSupabaseClient.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
    
    it('should validate email format', async () => {
      // Arrange
      const email = 'invalid-email';
      
      // Act & Assert
      await expect(service.resetPassword(email)).rejects.toThrow('Invalid email format');
      expect(mockSupabaseClient.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
    
    it('should handle reset errors', async () => {
      // Arrange
      const email = 'test@example.com';
      
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'Reset failed' },
      });
      
      // Act & Assert
      await expect(service.resetPassword(email)).rejects.toThrow('Password reset failed: Reset failed');
    });
  });
  
  describe('verifyToken', () => {
    it('should verify a token successfully', async () => {
      // Arrange
      const token = 'mock-token';
      const mockUser = createMockUser({ ativo: true });
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });
      
      mockUserRepository.findById.mockResolvedValue(mockUser);
      
      // Act
      const result = await service.verifyToken(token);
      
      // Assert
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(token);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });
    
    it('should validate required fields', async () => {
      // Arrange
      const token = '';
      
      // Act & Assert
      await expect(service.verifyToken(token)).rejects.toThrow('Token is required');
      expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalled();
    });
    
    it('should handle verification errors', async () => {
      // Arrange
      const token = 'mock-token';
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });
      
      // Act & Assert
      await expect(service.verifyToken(token)).rejects.toThrow('Token verification failed: Invalid token');
    });
    
    it('should handle invalid token', async () => {
      // Arrange
      const token = 'mock-token';
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      
      // Act & Assert
      await expect(service.verifyToken(token)).rejects.toThrow('Invalid token');
    });
    
    it('should handle user not found in database', async () => {
      // Arrange
      const token = 'mock-token';
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      });
      
      mockUserRepository.findById.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.verifyToken(token)).rejects.toThrow('User not found in database');
    });
    
    it('should handle inactive user account', async () => {
      // Arrange
      const token = 'mock-token';
      const mockUser = createMockUser({ ativo: false });
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });
      
      mockUserRepository.findById.mockResolvedValue(mockUser);
      
      // Act & Assert
      await expect(service.verifyToken(token)).rejects.toThrow('User account is inactive');
    });
  });
});