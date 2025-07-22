import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  path: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: string;
  memoryUsage: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private slowThreshold = 1000; // 1 segundo
  private memoryThreshold = 90; // 90% de uso de memória

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Interceptar o final da resposta
      res.on('finish', () => {
        const responseTime = Date.now() - start;
        const endMemory = process.memoryUsage().heapUsed;
        const memoryUsage = ((endMemory - startMemory) / 1024 / 1024); // MB

        const metric: PerformanceMetrics = {
          path: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString(),
          memoryUsage: Math.round(memoryUsage * 100) / 100
        };

        this.metrics.push(metric);
        this.analyzeMetric(metric);

        // Manter apenas as últimas 1000 métricas
        if (this.metrics.length > 1000) {
          this.metrics = this.metrics.slice(-1000);
        }
      });

      next();
    };
  }

  private analyzeMetric(metric: PerformanceMetrics) {
    const warnings = [];

    // Verificar tempo de resposta lento
    if (metric.responseTime > this.slowThreshold) {
      warnings.push(`🐌 Requisição lenta: ${metric.method} ${metric.path} (${metric.responseTime}ms)`);
    }

    // Verificar uso de memória alto
    if (metric.memoryUsage > 50) {
      warnings.push(`💾 Alto uso de memória: ${metric.memoryUsage}MB em ${metric.method} ${metric.path}`);
    }

    // Verificar erros 5xx
    if (metric.statusCode >= 500) {
      warnings.push(`❌ Erro do servidor: ${metric.statusCode} em ${metric.method} ${metric.path}`);
    }

    // Logar avisos
    if (warnings.length > 0) {
      console.log(`\n${warnings.join('\n')}\n`);
    }
  }

  getMetrics() {
    const now = Date.now();
    const lastHour = this.metrics.filter(m => 
      now - new Date(m.timestamp).getTime() < 60 * 60 * 1000
    );

    const avgResponseTime = lastHour.length > 0 
      ? Math.round(lastHour.reduce((sum, m) => sum + m.responseTime, 0) / lastHour.length)
      : 0;

    const slowRequests = lastHour.filter(m => m.responseTime > this.slowThreshold).length;
    const errors = lastHour.filter(m => m.statusCode >= 400).length;

    return {
      totalRequests: lastHour.length,
      avgResponseTime,
      slowRequests,
      errors,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
    };
  }

  getSlowestEndpoints(limit = 5) {
    const now = Date.now();
    const lastHour = this.metrics.filter(m => 
      now - new Date(m.timestamp).getTime() < 60 * 60 * 1000
    );

    const endpointStats = new Map<string, { count: number; totalTime: number; avgTime: number }>();

    lastHour.forEach(metric => {
      const key = `${metric.method} ${metric.path}`;
      const existing = endpointStats.get(key) || { count: 0, totalTime: 0, avgTime: 0 };
      
      existing.count++;
      existing.totalTime += metric.responseTime;
      existing.avgTime = Math.round(existing.totalTime / existing.count);
      
      endpointStats.set(key, existing);
    });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({ endpoint, ...stats }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }
}

export const performanceMonitor = new PerformanceMonitor(); 



