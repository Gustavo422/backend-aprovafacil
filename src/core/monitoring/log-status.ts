import fs from 'fs/promises';
import path from 'path';

export interface LogStatus {
  status: 'healthy' | 'warning' | 'error';
  recentLogs: {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    service?: string;
  }[];
  logStats: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
  logFiles: {
    name: string;
    size: number;
    lastModified: string;
  }[];
  errors: string[];
}

export async function getLogStatus(): Promise<LogStatus> {
  const errors: string[] = [];
  let recentLogs: LogStatus['recentLogs'] = [];
  let logStats = { total: 0, errors: 0, warnings: 0, info: 0 };
  let logFiles: LogStatus['logFiles'] = [];
  
  try {
    // Tentar encontrar arquivos de log
    const logDirs = [
      path.join(process.cwd(), 'logs'),
      path.join(process.cwd(), 'log'),
      path.join(process.cwd(), '.logs')
    ];
    
    for (const logDir of logDirs) {
      try {
        const entries = await fs.readdir(logDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isFile() && isLogFile(entry.name)) {
            const fullPath = path.join(logDir, entry.name);
            const stats = await fs.stat(fullPath);
            
            logFiles.push({
              name: entry.name,
              size: stats.size,
              lastModified: stats.mtime.toISOString()
            });
            
            // Ler logs recentes do arquivo
            if (stats.size > 0) {
              const logContent = await fs.readFile(fullPath, 'utf-8');
              const parsedLogs = parseLogFile(logContent);
              recentLogs.push(...parsedLogs);
            }
          }
        }
      } catch {
        // Diretório não existe, continuar
      }
    }
    
    // Ordenar logs por timestamp e pegar os mais recentes
    recentLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    recentLogs = recentLogs.slice(0, 50); // Últimos 50 logs
    
    // Calcular estatísticas
    logStats = {
      total: recentLogs.length,
      errors: recentLogs.filter(log => log.level === 'error').length,
      warnings: recentLogs.filter(log => log.level === 'warn').length,
      info: recentLogs.filter(log => log.level === 'info').length
    };
    
        } catch {
        errors.push('Erro ao processar logs');
      }
  
  // Status baseado na presença de erros recentes
  const status = logStats.errors > 5 ? 'error' : logStats.warnings > 10 ? 'warning' : 'healthy';
  
  return {
    status,
    recentLogs,
    logStats,
    logFiles,
    errors
  };
}

function isLogFile(filename: string): boolean {
  return filename.endsWith('.log') || 
         filename.includes('app.log') || 
         filename.includes('error.log') ||
         filename.includes('access.log');
}

function parseLogFile(content: string): LogStatus['recentLogs'] {
  const logs: LogStatus['recentLogs'] = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      // Tentar parsear como JSON primeiro
      const parsed = JSON.parse(line);
      if (parsed.timestamp && parsed.level && parsed.message) {
        logs.push({
          timestamp: parsed.timestamp,
          level: parsed.level,
          message: parsed.message,
          service: parsed.service
        });
      }
          } catch {
        // Se não for JSON, tentar parsear formato comum de log
        const logMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\s+(\w+)\s+(.+)/);
        if (logMatch) {
          logs.push({
            timestamp: logMatch[1],
            level: logMatch[2] as 'info' | 'warn' | 'error' | 'debug',
            message: logMatch[3]
          });
        }
      }
  }
  
  return logs;
} 