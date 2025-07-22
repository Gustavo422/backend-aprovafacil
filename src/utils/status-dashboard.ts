import { createHealthChecker } from './health-checker.js';
import { performanceMonitor } from '../middleware/performance-monitor.js';

class StatusDashboard {
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  start(intervalMs = 30000) { // Atualiza a cada 30 segundos
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.updateInterval = setInterval(() => {
      this.displayStatus();
    }, intervalMs);

    // Mostrar status inicial
    this.displayStatus();
    
    console.log('📊 Dashboard de status iniciado! Atualizações a cada 30 segundos.');
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('📊 Dashboard de status parado.');
  }

  private async displayStatus() {
    try {
      const healthChecker = createHealthChecker();
      const health = await healthChecker.getHealthStatus();
      const metrics = performanceMonitor.getMetrics();
      const slowestEndpoints = performanceMonitor.getSlowestEndpoints(3);

      console.clear();
      console.log('='.repeat(80));
      console.log('🚀 APROVA FÁCIL - DASHBOARD DE STATUS');
      console.log('='.repeat(80));
      console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`);
      console.log('');

      // Status Geral
      console.log('📈 STATUS GERAL:');
      console.log(`   🟢 Status: ${this.getStatusEmoji(health.status)} ${health.status.toUpperCase()}`);
      console.log(`   ⏱️  Uptime: ${this.formatUptime(health.uptime)}`);
      console.log(`   🌍 Ambiente: ${health.environment}`);
      console.log(`   📦 Versão: ${health.version}`);
      console.log('');

      // Recursos do Sistema
      console.log('💻 RECURSOS DO SISTEMA:');
      console.log(`   🧠 Memória: ${health.memory.used}MB / ${health.memory.total}MB (${health.memory.percentage}%)`);
      console.log(`   🔥 CPU Load: ${health.cpu.load} (${health.cpu.cores} cores)`);
      console.log('');

      // Banco de Dados
      console.log('🗄️  BANCO DE DADOS:');
      console.log(`   ${this.getDatabaseEmoji(health.database.status)} Status: ${health.database.status}`);
      if (health.database.responseTime) {
        console.log(`   ⚡ Tempo de resposta: ${health.database.responseTime}ms`);
      }
      if (health.database.error) {
        console.log(`   ❌ Erro: ${health.database.error}`);
      }
      console.log('');

      // Serviços
      console.log('🔧 SERVIÇOS:');
      console.log(`   ${this.getServiceEmoji(health.services.supabase)} Supabase: ${health.services.supabase}`);
      console.log(`   ${this.getServiceEmoji(health.services.api)} API: ${health.services.api}`);
      console.log('');

      // Métricas de Performance
      console.log('📊 PERFORMANCE (última hora):');
      console.log(`   📨 Total de requisições: ${metrics.totalRequests}`);
      console.log(`   ⏱️  Tempo médio de resposta: ${metrics.avgResponseTime}ms`);
      console.log(`   🐌 Requisições lentas: ${metrics.slowRequests}`);
      console.log(`   ❌ Erros: ${metrics.errors}`);
      console.log(`   💾 Uso de memória atual: ${Math.round(metrics.memoryUsage)}MB`);
      console.log('');

      // Endpoints mais lentos
      if (slowestEndpoints.length > 0) {
        console.log('🐌 ENDPOINTS MAIS LENTOS:');
        slowestEndpoints.forEach((endpoint, index) => {
          console.log(`   ${index + 1}. ${endpoint.endpoint}`);
          console.log(`      ⏱️  Tempo médio: ${endpoint.avgTime}ms (${endpoint.count} requisições)`);
        });
        console.log('');
      }

      // Alertas
      const alerts = this.getAlerts(health, metrics);
      if (alerts.length > 0) {
        console.log('⚠️  ALERTAS:');
        alerts.forEach(alert => console.log(`   ${alert}`));
        console.log('');
      }

      console.log('='.repeat(80));
      console.log('💡 Dica: Use Ctrl+C para parar o dashboard');
      console.log('='.repeat(80));

    } catch (error) {
      console.error('❌ Erro ao atualizar dashboard:', error);
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'unhealthy': return '🔴';
      default: return '⚪';
    }
  }

  private getDatabaseEmoji(status: string): string {
    switch (status) {
      case 'connected': return '🟢';
      case 'disconnected': return '🔴';
      case 'error': return '🔴';
      default: return '⚪';
    }
  }

  private getServiceEmoji(status: string): string {
    switch (status) {
      case 'connected':
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'disconnected':
      case 'unhealthy':
      case 'error': return '🔴';
      default: return '⚪';
    }
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private getAlerts(health: Awaited<ReturnType<ReturnType<typeof createHealthChecker>['getHealthStatus']>>, metrics: ReturnType<typeof performanceMonitor.getMetrics>): string[] {
    const alerts = [];

    // Alertas de memória
    if (health.memory.percentage > 90) {
      alerts.push(`🔴 Uso de memória crítico: ${health.memory.percentage}%`);
    } else if (health.memory.percentage > 80) {
      alerts.push(`🟡 Uso de memória alto: ${health.memory.percentage}%`);
    }

    // Alertas de CPU
    if (health.cpu.load > health.cpu.cores * 0.8) {
      alerts.push(`🟡 CPU sobrecarregado: load ${health.cpu.load} (${health.cpu.cores} cores)`);
    }

    // Alertas de banco de dados
    if (health.database.status !== 'connected') {
      alerts.push(`🔴 Problema de conexão com banco de dados`);
    }

    // Alertas de performance
    if (metrics.avgResponseTime > 1000) {
      alerts.push(`🟡 Tempo de resposta alto: ${metrics.avgResponseTime}ms`);
    }

    if (metrics.errors > 10) {
      alerts.push(`🔴 Muitos erros: ${metrics.errors} na última hora`);
    }

    return alerts;
  }

  // Método para mostrar status uma vez (sem loop)
  async showStatusOnce() {
    await this.displayStatus();
  }
}

export const statusDashboard = new StatusDashboard(); 