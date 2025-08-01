// ===== INTERFACES PARA SISTEMA DE AUTENTICAÇÃO SOLID =====

import { Usuario } from '../../shared/types/index.js';

// ===== INTERFACES PRINCIPAIS =====

export interface IAuthenticationService {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(sessionId: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthResult>;
  validateToken(token: string): Promise<TokenValidationResult>;
}

export interface ISessionManager {
  createSession(usuarioId: string, deviceInfo: DeviceInfo): Promise<UserSession>;
  validateSession(sessionId: string): Promise<UserSession | null>;
  invalidateSession(sessionId: string): Promise<void>;
  invalidateAllUserSessions(usuarioId: string, exceptSessionId?: string): Promise<void>;
  cleanExpiredSessions(): Promise<number>;
  getUserActiveSessions(usuarioId: string): Promise<UserSession[]>;
  // Métodos para concorrência de sessões
  detectConcurrentSessions(usuarioId: string, maxSessions: number): Promise<boolean>;
  terminateOldestSessions(usuarioId: string, maxSessions: number): Promise<void>;
}

export interface ISecurityService {
  checkLoginAttempts(email: string, ipAddress: string): Promise<SecurityCheckResult>;
  recordLoginAttempt(attempt: LoginAttempt): Promise<void>;
  isAccountLocked(email: string): Promise<boolean>;
  unlockAccount(email: string): Promise<void>;
  detectSuspiciousActivity(usuarioId: string, deviceInfo: DeviceInfo): Promise<boolean>;
}

export interface IPasswordService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  validatePasswordStrength(password: string): PasswordStrengthResult;
  generateSecureToken(): string;
}

export interface ITokenService {
  generateAccessToken(payload: TokenPayload): Promise<string>;
  generateRefreshToken(usuarioId: string): Promise<string>;
  verifyToken(token: string): Promise<TokenPayload | null>;
  revokeToken(token: string): Promise<void>;
  cleanExpiredTokens(): Promise<number>;
  // Métodos utilitários
  generateTokenPair(payload: TokenPayload): Promise<{ accessToken: string; refreshToken: string }>;
  isValidTokenStructure(token: string): boolean;
  isTokenExpired(token: string): boolean;
}

export interface IUserSecurityRepository {
  getUserSecurityConfig(usuarioId: string): Promise<UserSecurityConfig>;
  updateSecurityConfig(usuarioId: string, config: Partial<UserSecurityConfig>): Promise<void>;
  createDefaultSecurityConfig(usuarioId: string): Promise<UserSecurityConfig>;
}

export interface ISessionRepository {
  create(session: CreateSessionData): Promise<UserSession>;
  findById(sessionId: string): Promise<UserSession | null>;
  findByTokenHash(tokenHash: string): Promise<UserSession | null>;
  findActiveByUserId(usuarioId: string): Promise<UserSession[]>;
  update(sessionId: string, data: Partial<UserSession>): Promise<UserSession>;
  delete(sessionId: string): Promise<void>;
  deleteExpired(): Promise<number>;
  deleteAllByUserId(usuarioId: string, exceptSessionId?: string): Promise<void>;
}

export interface ISecurityRepository {
  recordLoginAttempt(attempt: LoginAttempt): Promise<void>;
  getRecentFailedAttempts(email: string, ipAddress: string, windowMinutes: number): Promise<number>;
  getLoginStatistics(days: number): Promise<LoginStatistics[]>;
  createRecoveryToken(data: CreateRecoveryTokenData): Promise<RecoveryToken>;
  findRecoveryToken(tokenHash: string): Promise<RecoveryToken | null>;
  markRecoveryTokenAsUsed(tokenId: string): Promise<void>;
  cleanExpiredRecoveryTokens(): Promise<number>;
}

// ===== TIPOS E INTERFACES DE DADOS =====

export interface LoginCredentials {
  email: string;
  password: string;
  deviceInfo?: DeviceInfo;
  rememberMe?: boolean;
}

export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceName?: string;
  platform?: string;
  browser?: string;
}

export interface AuthResult {
  success: boolean;
  user?: Usuario;
  accessToken?: string;
  refreshToken?: string;
  session?: UserSession;
  error?: AuthError;
  requiresTwoFactor?: boolean;
  requiresPasswordChange?: boolean;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: Usuario;
  session?: UserSession;
  error?: string;
  needsRefresh?: boolean;
}

export interface UserSession {
  id: string;
  usuarioId: string;
  tokenHash: string;
  deviceInfo?: DeviceInfo;
  ativo: boolean;
  ultimoAcesso: Date;
  expiraEm: Date;
  criadoEm: Date;
}

export interface CreateSessionData {
  usuarioId: string;
  tokenHash: string;
  deviceInfo?: DeviceInfo;
  expiresIn?: number; // em segundos
}

export interface LoginAttempt {
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  timestamp?: Date;
}

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  remainingAttempts?: number;
  lockoutTimeRemaining?: number;
}

export interface UserSecurityConfig {
  id: string;
  usuarioId: string;
  autenticacaoDoisFatores: boolean;
  notificarLoginNovoDispositivo: boolean;
  sessoesMultiplasPermitidas: boolean;
  maxTentativasLogin: number;
  tempoBloqueioMinutos: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface PasswordStrengthResult {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
  };
}

export interface TokenPayload {
  usuarioId: string;
  sessionId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  customClaims?: unknown;
}

export interface RecoveryToken {
  id: string;
  usuarioId: string;
  tokenHash: string;
  usado: boolean;
  expiraEm: Date;
  criadoEm: Date;
  usadoEm?: Date;
}

export interface CreateRecoveryTokenData {
  usuarioId: string;
  tokenHash: string;
  expiresIn?: number; // em segundos, padrão 1 hora
}

export interface LoginStatistics {
  data: Date;
  totalTentativas: number;
  sucessos: number;
  falhas: number;
  usuariosUnicos: number;
  ipsUnicos: number;
}

export interface AuthError {
  code: string;
  message: string;
  details?: unknown;
}

// ===== ENUMS =====

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED'
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  SUSPICIOUS = 'SUSPICIOUS'
}

// ===== CONFIGURAÇÕES =====

export interface AuthConfig {
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  security: {
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    sessionTimeoutMinutes: number;
    passwordMinLength: number;
    requireStrongPassword: boolean;
    allowMultipleSessions: boolean;
  };
  features: {
    twoFactorAuth: boolean;
    deviceTrusting: boolean;
    suspiciousActivityDetection: boolean;
    emailNotifications: boolean;
  };
}