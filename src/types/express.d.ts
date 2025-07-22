declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        nome?: string;
        ativo?: boolean;
        primeiro_login?: boolean;
        is_admin?: boolean;
      };
      authToken?: string;
      session?: {
        id: string;
        deviceInfo?: unknown;
        ipAddress?: string;
        lastActivity: Date;
      };
      requestId?: string;
    }
  }
}

export {}; 