// Session management
export { SessionManager, type SessionOptions } from './session-manager';

// Role-based access control
export { RoleManager, UserRole, type RolePermission } from './role-manager';

// Re-export middleware
// export {
//   createAuthMiddleware,
//   createRoleMiddleware,
//   createExpressAuthMiddleware,
//   createExpressRoleMiddleware,
//   type AuthOptions,
// } from '../api/auth-middleware';