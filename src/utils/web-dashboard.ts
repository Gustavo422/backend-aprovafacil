import express from 'express';
import { healthChecker } from './health-checker.js';
import { performanceMonitor } from '../middleware/performance-monitor.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireAdmin } from '../middleware/auth.js';

const execAsync = promisify(exec);

class WebDashboard {
  private app: express.Application;
  private port: number;

  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.use(express.json());
    this.app.use(express.static('public'));

    // API para dados do dashboard
    this.app.get('/api/dashboard/health', async (req, res) => {
      try {
        const health = await healthChecker.getHealthStatus();
        res.json(health);
      } catch {
        res.status(500).json({ error: 'Erro ao obter health status' });
      }
    });

    this.app.get('/api/dashboard/metrics', (req, res) => {
      const metrics = performanceMonitor.getMetrics();
      const slowestEndpoints = performanceMonitor.getSlowestEndpoints(10);
      
      res.json({
        metrics,
        slowestEndpoints,
        timestamp: new Date().toISOString()
      });
    });

    // API para executar testes
    this.app.post('/api/dashboard/run-tests', requireAdmin, async (req, res) => {
      try {
        const { stdout, stderr } = await execAsync('npm test', { 
          cwd: process.cwd(),
          timeout: 30000 
        });
        
        res.json({
          success: true,
          output: stdout,
          error: stderr
        });
      } catch {
        res.json({
          success: false,
          output: '',
          error: 'Erro ao executar testes'
        });
      }
    });

    // API para logs do sistema
    this.app.get('/api/dashboard/logs', async (req, res) => {
      const { logger } = await import('./logger.js');
      const logs = logger.getLogs(50);
      res.json(logs);
    });

    // API para estatísticas dos logs
    this.app.get('/api/dashboard/log-stats', async (req, res) => {
      const { logger } = await import('./logger.js');
      const stats = logger.getLogStats();
      res.json(stats);
    });

    // API para exportar logs
    this.app.get('/api/dashboard/logs/export', requireAdmin, async (req, res) => {
      const { logger } = await import('./logger.js');
      const format = (req.query.format as string) || 'json';
      const level = req.query.level as string | undefined;
      const service = req.query.service as string | undefined;
      const limit = parseInt((req.query.limit as string) || '100', 10);

      let logs = logger.getLogs(limit);
      if (level) logs = logs.filter(log => log.level === level);
      if (service) logs = logs.filter(log => log.service === service);

      let contentType = 'application/json';
      let fileContent = '';
      let fileName = 'logs.' + format;

      if (format === 'json') {
        fileContent = JSON.stringify(logs, null, 2);
        contentType = 'application/json';
      } else if (format === 'txt') {
        fileContent = logs.map(log => `[${log.timestamp}] [${log.level}] [${log.service}] ${log.message}`).join('\n');
        contentType = 'text/plain';
      } else if (format === 'csv') {
        const header = 'timestamp,level,service,message';
        const rows = logs.map(log =>
          [log.timestamp, log.level, log.service, '"' + (log.message?.replace(/"/g, '""') || '') + '"'].join(',')
        );
        fileContent = [header, ...rows].join('\n');
        contentType = 'text/csv';
      } else {
        res.status(400).send('Formato não suportado');
        return;
      }

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', contentType);
      res.send(fileContent);
    });

    // SSE para logs em tempo real
    const logClients: import('express').Response[] = [];
    this.app.get('/api/dashboard/logs/stream', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      logClients.push(res);

      req.on('close', () => {
        const idx = logClients.indexOf(res);
        if (idx !== -1) logClients.splice(idx, 1);
      });
    });

    // Patch logger para emitir logs em tempo real
    const patchLoggerForSSE = async () => {
      const { logger } = await import('./logger.js');
      const origAddToMemory = logger.addToMemory.bind(logger);
      logger.addToMemory = (level, message, service, metadata) => {
        origAddToMemory(level, message, service, metadata);
        const logEntry = logger.logs[logger.logs.length - 1];
        const data = `data: ${JSON.stringify(logEntry)}\n\n`;
        logClients.forEach(client => client.write(data));
      };
    };
    patchLoggerForSSE();

    // Página principal do dashboard
    this.app.get('/', (req, res) => {
      res.send(this.getDashboardHTML());
    });
  }

  private getDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aprova Fácil - Central de Monitoramento</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --background: 222.2 84% 4.9%;
            --foreground: 210 40% 98%;
            --card: 222.2 84% 4.9%;
            --card-foreground: 210 40% 98%;
            --primary: 217.2 91.2% 59.8%;
            --primary-foreground: 222.2 84% 4.9%;
            --secondary: 217.2 32.6% 17.5%;
            --secondary-foreground: 210 40% 98%;
            --muted: 217.2 32.6% 17.5%;
            --muted-foreground: 215 20.2% 65.1%;
            --accent: 217.2 32.6% 17.5%;
            --accent-foreground: 210 40% 98%;
            --destructive: 0 62.8% 30.6%;
            --destructive-foreground: 210 40% 98%;
            --border: 217.2 32.6% 17.5%;
            --input: 217.2 32.6% 17.5%;
            --ring: 224.3 76.3% 48%;
            --radius: 0.75rem;
        }

        * {
            border-color: hsl(var(--border));
        }

        body {
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .card {
            background-color: hsl(var(--card));
            border: 1px solid hsl(var(--border));
            border-radius: var(--radius);
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
            transition: all 0.2s ease-in-out;
        }

        .card:hover {
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            transform: translateY(-1px);
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            white-space: nowrap;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s ease-in-out;
            cursor: pointer;
            border: none;
            outline: none;
        }

        .btn:focus-visible {
            outline: 2px solid hsl(var(--ring));
            outline-offset: 2px;
        }

        .btn:disabled {
            pointer-events: none;
            opacity: 0.5;
        }

        .btn-primary {
            background-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        }

        .btn-primary:hover {
            background-color: hsl(var(--primary) / 0.9);
        }

        .btn-secondary {
            background-color: hsl(var(--secondary));
            color: hsl(var(--secondary-foreground));
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        }

        .btn-secondary:hover {
            background-color: hsl(var(--secondary) / 0.8);
        }

        .btn-success {
            background-color: #10b981;
            color: white;
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        }

        .btn-success:hover {
            background-color: #059669;
        }

        .btn-warning {
            background-color: #f59e0b;
            color: white;
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        }

        .btn-warning:hover {
            background-color: #d97706;
        }

        .btn-danger {
            background-color: hsl(var(--destructive));
            color: hsl(var(--destructive-foreground));
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        }

        .btn-danger:hover {
            background-color: hsl(var(--destructive) / 0.9);
        }

        .btn-sm {
            height: 2.25rem;
            padding: 0 0.75rem;
            font-size: 0.875rem;
        }

        .btn-md {
            height: 2.5rem;
            padding: 0 1rem;
        }

        .btn-lg {
            height: 3rem;
            padding: 0 1.5rem;
            font-size: 1rem;
        }

        .status-healthy { background-color: #10b981; }
        .status-degraded { background-color: #f59e0b; }
        .status-unhealthy { background-color: #ef4444; }

        .gradient-bg {
            background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%);
        }

        .glass-effect {
            backdrop-filter: blur(10px);
            background: hsl(var(--card) / 0.8);
            border: 1px solid hsl(var(--border) / 0.5);
        }

        .animate-pulse-subtle {
            animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse-subtle {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }

        .loading-spinner {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .scrollbar-custom::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        .scrollbar-custom::-webkit-scrollbar-track {
            background: hsl(var(--muted));
        }

        .scrollbar-custom::-webkit-scrollbar-thumb {
            background: hsl(var(--muted-foreground));
            border-radius: 3px;
        }

        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
            background: hsl(var(--primary));
        }
    </style>
</head>
<body class="min-h-screen bg-background text-foreground">
    <div class="container mx-auto px-4 py-8 max-w-7xl">
        <!-- Header -->
        <div class="text-center mb-8">
            <div class="gradient-bg rounded-2xl p-8 mb-6">
                <h1 class="text-4xl font-bold mb-2 text-white">
                    <i class="fas fa-rocket mr-3"></i>Aprova Fácil
                </h1>
                <p class="text-xl text-white/90">Central de Monitoramento</p>
                <p class="text-sm text-white/75 mt-2" id="lastUpdate">Carregando...</p>
            </div>
        </div>

        <!-- Status Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="card p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Status Geral</h3>
                    <i class="fas fa-heartbeat text-xl"></i>
                </div>
                <div class="flex items-center">
                    <div id="statusIndicator" class="w-4 h-4 rounded-full mr-3 animate-pulse-subtle"></div>
                    <span id="statusText" class="text-xl font-bold">Carregando...</span>
                </div>
            </div>

            <div class="card p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Uptime</h3>
                    <i class="fas fa-clock text-xl"></i>
                </div>
                <div id="uptime" class="text-2xl font-bold">--</div>
            </div>

            <div class="card p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Memória</h3>
                    <i class="fas fa-memory text-xl"></i>
                </div>
                <div id="memory" class="text-2xl font-bold mb-2">--</div>
                <div class="w-full bg-muted rounded-full h-2">
                    <div id="memoryFill" class="h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
            </div>

            <div class="card p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">CPU Load</h3>
                    <i class="fas fa-microchip text-xl"></i>
                </div>
                <div id="cpu" class="text-2xl font-bold">--</div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Performance Chart -->
            <div class="lg:col-span-2">
                <div class="card p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-semibold">
                            <i class="fas fa-chart-line mr-2"></i>Performance (Última Hora)
                        </h3>
                        <div class="flex gap-2">
                            <button onclick="refreshChart()" class="btn btn-secondary btn-sm">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="relative h-80" style="background:rgba(30,32,40,0.85); border-radius:1rem; border:1.5px solid hsl(var(--border)); box-shadow:0 2px 8px 0 rgba(0,0,0,0.12);">
                        <canvas id="performanceChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="space-y-6">
                <div class="card p-6">
                    <h3 class="text-xl font-semibold mb-4">
                        <i class="fas fa-bolt mr-2"></i>Ações Rápidas
                    </h3>
                    <div class="space-y-3">
                        <button onclick="runTests()" id="runTestsBtn" class="btn btn-primary w-full btn-md">
                            <i class="fas fa-vial"></i>
                            <span>Executar Testes</span>
                        </button>
                        <button onclick="openSwagger()" class="btn btn-success w-full btn-md">
                            <i class="fas fa-book"></i>
                            <span>Abrir Swagger UI</span>
                        </button>
                        <button onclick="openAPI()" class="btn btn-warning w-full btn-md">
                            <i class="fas fa-link"></i>
                            <span>Ver API Docs</span>
                        </button>
                        <button onclick="refreshDashboard()" class="btn btn-secondary w-full btn-md">
                            <i class="fas fa-sync-alt"></i>
                            <span>Atualizar Dashboard</span>
                        </button>
                    </div>
                </div>

                <div class="card p-6">
                    <h3 class="text-xl font-semibold mb-4">
                        <i class="fas fa-tachometer-alt mr-2"></i>Endpoints Mais Lentos
                    </h3>
                    <div id="slowEndpoints" class="space-y-2">
                        <div class="flex items-center justify-center py-4">
                            <div class="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Services Status -->
        <div class="mt-8">
            <div class="card p-6">
                <h3 class="text-xl font-semibold mb-4">
                    <i class="fas fa-server mr-2"></i>Status dos Serviços
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="servicesStatus">
                    <div class="flex items-center justify-center py-4">
                        <div class="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recent Logs -->
        <div class="mt-8">
            <div class="card p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold">
                        <i class="fas fa-file-alt mr-2"></i>Logs Recentes
                    </h3>
                    <button onclick="clearLogs()" class="btn btn-secondary btn-sm">
                        <i class="fas fa-trash"></i>
                        <span>Limpar</span>
                    </button>
                </div>
                <div id="recentLogs" class="space-y-2 max-h-64 overflow-y-auto scrollbar-custom">
                    <div class="flex items-center justify-center py-4">
                        <div class="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="mt-8 text-center text-sm text-muted-foreground">
            <p>Central de Monitoramento - Aprova Fácil Backend</p>
            <p class="mt-1">Desenvolvido com ❤️ para facilitar o monitoramento</p>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="fixed top-4 right-4 z-50 hidden">
        <div class="bg-card border border-border rounded-lg p-4 shadow-lg max-w-sm">
            <div class="flex items-center">
                <div id="toastIcon" class="mr-3"></div>
                <div>
                    <div id="toastTitle" class="font-semibold"></div>
                    <div id="toastMessage" class="text-sm text-muted-foreground"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let performanceChart;
        let updateInterval;
        let isUpdating = false;

        // Inicializar dashboard
        document.addEventListener('DOMContentLoaded', function() {
            initializeChart();
            updateDashboard();
            updateInterval = setInterval(updateDashboard, 10000); // Atualizar a cada 10s
        });

        function initializeChart() {
            const ctx = document.getElementById('performanceChart').getContext('2d');
            performanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Tempo de Resposta (ms)',
                        data: [],
                        borderColor: '#38bdf8', // azul vibrante
                        backgroundColor: 'rgba(56,189,248,0.18)', // azul claro translúcido
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#38bdf8',
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255,255,255,0.10)',
                                borderColor: 'rgba(255,255,255,0.18)'
                            },
                            ticks: {
                                color: '#e0e6ed',
                                font: { weight: 'bold' }
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255,255,255,0.08)'
                            },
                            ticks: {
                                color: '#e0e6ed',
                                font: { weight: 'bold' }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#38bdf8', // azul vibrante para legenda
                                font: { weight: 'bold' }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(30,32,40,0.95)',
                            titleColor: '#fff',
                            bodyColor: '#e0e6ed',
                            borderColor: '#38bdf8',
                            borderWidth: 1.5
                        }
                    }
                }
            });
        }

        async function updateDashboard() {
            if (isUpdating) return;
            isUpdating = true;

            try {
                // Atualizar health status
                const healthResponse = await fetch('/api/dashboard/health');
                const health = await healthResponse.json();
                
                // Atualizar métricas
                const metricsResponse = await fetch('/api/dashboard/metrics');
                const metrics = await metricsResponse.json();

                updateHealthStatus(health);
                updateMetrics(metrics);
                updateServicesStatus(health);
                updatePerformanceChart(metrics);
                updateSlowEndpoints(metrics);
                updateLogs();

                document.getElementById('lastUpdate').textContent = 
                    'Última atualização: ' + new Date().toLocaleString('pt-BR');

            } catch (error) {
                console.error('Erro ao atualizar dashboard:', error);
                showToast('Erro', 'Falha ao atualizar dashboard', 'error');
            } finally {
                isUpdating = false;
            }
        }

        function updateHealthStatus(health) {
            const statusIndicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');
            const uptime = document.getElementById('uptime');
            const memory = document.getElementById('memory');
            const memoryFill = document.getElementById('memoryFill');
            const cpu = document.getElementById('cpu');

            // Status
            statusText.textContent = health.status.toUpperCase();
            statusIndicator.className = 'w-4 h-4 rounded-full mr-3 status-' + health.status;

            // Uptime
            uptime.textContent = formatUptime(health.uptime);

            // Memory
            memory.textContent = \`\${health.memory.used}MB (\${health.memory.percentage}%)\`;
            memoryFill.style.width = health.memory.percentage + '%';
            
            const memoryColor = health.memory.percentage > 80 ? '#ef4444' : 
                              health.memory.percentage > 60 ? '#f59e0b' : '#10b981';
            memoryFill.style.backgroundColor = memoryColor;

            // CPU
            cpu.textContent = health.cpu.load + ' (' + health.cpu.cores + ' cores)';
        }

        function updateMetrics(metrics) {
            // Atualizar dados do gráfico
            const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            performanceChart.data.labels.push(now);
            performanceChart.data.datasets[0].data.push(metrics.metrics.avgResponseTime);

            // Manter apenas os últimos 20 pontos
            if (performanceChart.data.labels.length > 20) {
                performanceChart.data.labels.shift();
                performanceChart.data.datasets[0].data.shift();
            }

            performanceChart.update('none');
        }

        function updateServicesStatus(health) {
            const servicesContainer = document.getElementById('servicesStatus');
            servicesContainer.innerHTML = '';

            Object.entries(health.services).forEach(([service, status]) => {
                const serviceDiv = document.createElement('div');
                serviceDiv.className = 'flex items-center justify-between p-4 bg-muted/50 rounded-lg';
                
                const statusColor = status === 'connected' || status === 'healthy' ? '#10b981' : 
                                  status === 'degraded' ? '#f59e0b' : '#ef4444';

                const statusIcon = status === 'connected' || status === 'healthy' ? 'fa-check-circle' :
                                 status === 'degraded' ? 'fa-exclamation-triangle' : 'fa-times-circle';

                serviceDiv.innerHTML = \`
                    <div class="flex items-center">
                        <i class="fas \${statusIcon} mr-3" style="color: \${statusColor}"></i>
                        <span class="font-medium">\${service.charAt(0).toUpperCase() + service.slice(1)}</span>
                    </div>
                    <div class="flex items-center">
                        <div class="w-3 h-3 rounded-full mr-2" style="background-color: \${statusColor}"></div>
                        <span class="text-sm capitalize">\${status}</span>
                    </div>
                \`;
                
                servicesContainer.appendChild(serviceDiv);
            });
        }

        function updateSlowEndpoints(metrics) {
            const container = document.getElementById('slowEndpoints');
            
            if (metrics.slowestEndpoints.length === 0) {
                container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-4">Nenhum endpoint lento detectado</p>';
                return;
            }

            container.innerHTML = metrics.slowestEndpoints
                .slice(0, 5)
                .map((endpoint, index) => \`
                    <div class="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <div class="flex items-center">
                            <span class="text-xs bg-primary/20 text-primary px-2 py-1 rounded mr-3">#\${index + 1}</span>
                            <span class="text-sm truncate">\${endpoint.endpoint}</span>
                        </div>
                        <span class="font-mono text-sm font-semibold">\${endpoint.avgTime}ms</span>
                    </div>
                \`).join('');
        }

        async function updateLogs() {
            try {
                const response = await fetch('/api/dashboard/logs');
                const logs = await response.json();
                
                const container = document.getElementById('recentLogs');
                container.innerHTML = logs
                    .slice(-10)
                    .map(log => {
                        const logColor = log.level === 'error' ? '#ef4444' : 
                                       log.level === 'warn' ? '#f59e0b' : '#10b981';
                        const logIcon = log.level === 'error' ? 'fa-exclamation-circle' :
                                      log.level === 'warn' ? 'fa-exclamation-triangle' : 'fa-info-circle';
                        
                        return \`
                            <div class="flex items-start p-3 bg-muted/30 rounded-lg">
                                <i class="fas \${logIcon} mr-3 mt-1" style="color: \${logColor}"></i>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between mb-1">
                                        <span class="text-xs text-muted-foreground">\${new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                                        <span class="text-xs font-medium uppercase" style="color: \${logColor}">\${log.level}</span>
                                    </div>
                                    <p class="text-sm break-words">\${log.message}</p>
                                </div>
                            </div>
                        \`;
                    }).join('');
            } catch (error) {
                console.error('Erro ao carregar logs:', error);
            }
        }

        function formatUptime(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) return \`\${days}d \${hours % 24}h\`;
            if (hours > 0) return \`\${hours}h \${minutes % 60}m\`;
            if (minutes > 0) return \`\${minutes}m \${seconds % 60}s\`;
            return \`\${seconds}s\`;
        }

        async function runTests() {
            const button = document.getElementById('runTestsBtn');
            const originalContent = button.innerHTML;
            
            button.innerHTML = '<i class="fas fa-spinner loading-spinner"></i><span>Executando...</span>';
            button.disabled = true;

            try {
                const response = await fetch('/api/dashboard/run-tests', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    showToast('Sucesso', 'Testes executados com sucesso!', 'success');
                    console.log('Output dos testes:', result.output);
                } else {
                    showToast('Erro', 'Falha nos testes: ' + result.error, 'error');
                }
            } catch (error) {
                showToast('Erro', 'Erro ao executar testes: ' + error.message, 'error');
            } finally {
                button.innerHTML = originalContent;
                button.disabled = false;
            }
        }

        function openSwagger() {
            window.open('http://localhost:5000/api/docs/swagger', '_blank');
        }

        function openAPI() {
            window.open('http://localhost:5000/api/docs', '_blank');
        }

        function refreshDashboard() {
            updateDashboard();
            showToast('Info', 'Dashboard atualizado', 'info');
        }

        function refreshChart() {
            performanceChart.data.labels = [];
            performanceChart.data.datasets[0].data = [];
            performanceChart.update();
            showToast('Info', 'Gráfico atualizado', 'info');
        }

        function clearLogs() {
            const container = document.getElementById('recentLogs');
            container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-4">Logs limpos</p>';
            showToast('Info', 'Logs limpos', 'info');
        }

        function showToast(title, message, type = 'info') {
            const toast = document.getElementById('toast');
            const toastIcon = document.getElementById('toastIcon');
            const toastTitle = document.getElementById('toastTitle');
            const toastMessage = document.getElementById('toastMessage');

            const icons = {
                success: '<i class="fas fa-check-circle text-green-500"></i>',
                error: '<i class="fas fa-exclamation-circle text-red-500"></i>',
                warning: '<i class="fas fa-exclamation-triangle text-yellow-500"></i>',
                info: '<i class="fas fa-info-circle text-blue-500"></i>'
            };

            toastIcon.innerHTML = icons[type] || icons.info;
            toastTitle.textContent = title;
            toastMessage.textContent = message;

            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }

        // Cleanup ao sair
        window.addEventListener('beforeunload', () => {
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        });
    </script>
</body>
</html>
    `;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`\n🎯 Central de Monitoramento iniciada!`);
      console.log(`📊 Dashboard: http://localhost:${this.port}`);
      console.log(`🔗 API Backend: http://localhost:5000`);
      console.log(`📚 Swagger UI: http://localhost:5000/api/docs/swagger`);
      console.log(`\n💡 Acesse o dashboard para monitorar tudo em tempo real!\n`);
    });
  }
}

export { WebDashboard }; 