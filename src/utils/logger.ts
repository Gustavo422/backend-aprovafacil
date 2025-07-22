// import winston from 'winston';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  metadata?: Record<string, unknown>;
}

class StructuredLogger {
  // private logger: winston.Logger;
  public logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    // Temporarily disabled winston to fix startup issue
    console.log('[LOGGER] Using simplified logger (winston disabled)');
  }

  private simpleLog(level: string, message: string, metadata?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const logMessage = metadata 
      ? `[${level.toUpperCase()}] ${timestamp} - ${message} ${JSON.stringify(metadata)}`
      : `[${level.toUpperCase()}] ${timestamp} - ${message}`;
    console.log(logMessage);
  }

  public addToMemory(level: string, message: string, service: string, metadata?: Record<string, unknown>) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service,
      metadata
    };

    this.logs.push(logEntry);

    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  info(message: string, service = 'backend', metadata?: Record<string, unknown>) {
    this.simpleLog('info', message, metadata);
    this.addToMemory('info', message, service, metadata);
  }

  warn(message: string, service = 'backend', metadata?: Record<string, unknown>) {
    this.simpleLog('warn', message, metadata);
    this.addToMemory('warn', message, service, metadata);
  }

  error(message: string, service = 'backend', metadata?: Record<string, unknown>) {
    this.simpleLog('error', message, metadata);
    this.addToMemory('error', message, service, metadata);
  }

  debug(message: string, service = 'backend', metadata?: Record<string, unknown>) {
    this.simpleLog('debug', message, metadata);
    this.addToMemory('debug', message, service, metadata);
  }

  // Métodos específicos para diferentes serviços
  api(message: string, metadata?: Record<string, unknown>) {
    this.info(message, 'api', metadata);
  }

  database(message: string, metadata?: Record<string, unknown>) {
    this.info(message, 'database', metadata);
  }

  auth(message: string, metadata?: Record<string, unknown>) {
    this.info(message, 'auth', metadata);
  }

  performance(message: string, metadata?: Record<string, unknown>) {
    this.info(message, 'performance', metadata);
  }

  // Obter logs para o dashboard
  getLogs(limit = 50): LogEntry[] {
    return this.logs.slice(-limit);
  }

  // Obter logs por nível
  getLogsByLevel(level: string, limit = 50): LogEntry[] {
    return this.logs
      .filter(log => log.level === level)
      .slice(-limit);
  }

  // Obter logs por serviço
  getLogsByService(service: string, limit = 50): LogEntry[] {
    return this.logs
      .filter(log => log.service === service)
      .slice(-limit);
  }

  // Limpar logs antigos
  clearOldLogs(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoff);
  }

  // Estatísticas dos logs
  getLogStats() {
    const now = Date.now();
    const lastHour = this.logs.filter(log => 
      now - new Date(log.timestamp).getTime() < 60 * 60 * 1000
    );

    const stats = {
      total: this.logs.length,
      lastHour: lastHour.length,
      byLevel: {} as Record<string, number>,
      byService: {} as Record<string, number>
    };

    // Contar por nível
    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byService[log.service] = (stats.byService[log.service] || 0) + 1;
    });

    return stats;
  }
}

export const logger = new StructuredLogger(); 



