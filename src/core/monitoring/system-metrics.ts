import os from 'os';

export interface SystemMetrics {
  status: 'healthy' | 'warning' | 'error';
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  uptime: number;
  platform: string;
  nodeVersion: string;
  warnings: string[];
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const warnings: string[] = [];
  
  // CPU
  const cpuUsage = os.loadavg()[0]; // 1 min load average
  const cpuCores = os.cpus().length;
  const loadAverage = os.loadavg();
  
  // Memory
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsage = (usedMem / totalMem) * 100;
  
  // Verificar thresholds
  if (cpuUsage > cpuCores * 0.8) {
    warnings.push(`CPU load alto: ${cpuUsage.toFixed(2)}`);
  }
  
  if (memoryUsage > 85) {
    warnings.push(`Uso de memória alto: ${memoryUsage.toFixed(1)}%`);
  }
  
  const status = warnings.length > 0 ? 'warning' : 'healthy';
  
  return {
    status,
    cpu: {
      usage: cpuUsage,
      cores: cpuCores,
      loadAverage,
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usage: memoryUsage,
    },
    uptime: os.uptime(),
    platform: os.platform(),
    nodeVersion: process.version,
    warnings,
  };
} 



