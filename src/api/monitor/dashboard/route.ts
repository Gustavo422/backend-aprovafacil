const DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AprovaFácil - Central de Monitoramento Avançada</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .status-healthy { background-color: #10b981; }
        .status-warning { background-color: #f59e0b; }
        .status-error { background-color: #ef4444; }
        .card { backdrop-filter: blur(10px); }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-bounce { animation: bounce 1s infinite; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
            50% { transform: none; animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
        }
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .glass-effect {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .metric-card {
            transition: all 0.3s ease;
        }
        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }
        .alert-badge {
            animation: bounce 2s infinite;
        }
    </style>
</head>
<body class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen text-white">
    <div class="container mx-auto px-4 py-8">
        <!-- Header com Alertas -->
        <div class="text-center mb-8">
            <div class="flex items-center justify-center mb-4">
                <h1 class="text-4xl font-bold mr-4">🚀 Central de Monitoramento</h1>
                <div id="alert-badge" class="alert-badge hidden">
                    <i class="fas fa-exclamation-triangle text-yellow-400 text-2xl"></i>
                </div>
            </div>
            <p class="text-slate-300 mb-6">AprovaFácil Backend - Monitoramento Avançado em Tempo Real</p>
            
            <!-- Alertas -->
            <div id="alerts-container" class="mb-6"></div>
            
            <!-- Ações Rápidas -->
            <div class="flex flex-wrap justify-center gap-4 mb-6">
                <button onclick="refreshData()" class="glass-effect hover:bg-white/20 px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2">
                    <i class="fas fa-sync-alt"></i>
                    Atualizar
                </button>
                <button onclick="runTests()" class="glass-effect hover:bg-white/20 px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2">
                    <i class="fas fa-vial"></i>
                    Executar Testes
                </button>
                <a href="/api/docs" target="_blank" class="glass-effect hover:bg-white/20 px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2">
                    <i class="fas fa-book"></i>
                    API Docs
                </a>
                <button onclick="toggleDarkMode()" class="glass-effect hover:bg-white/20 px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2">
                    <i class="fas fa-moon"></i>
                    Dark Mode
                </button>
            </div>
        </div>

        <!-- Status Geral com Métricas Rápidas -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Status Geral -->
            <div id="overall-status" class="metric-card glass-effect rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Status Geral</h3>
                    <div id="status-indicator" class="w-4 h-4 rounded-full animate-pulse"></div>
                </div>
                <div class="text-center">
                    <div id="status-text" class="text-2xl font-bold mb-2">Carregando...</div>
                    <div class="text-sm text-slate-300 space-y-1">
                        <div>Uptime: <span id="uptime" class="font-medium">-</span></div>
                        <div>Versão: <span id="version" class="font-medium">-</span></div>
                    </div>
                </div>
            </div>

            <!-- Sistema -->
            <div class="metric-card glass-effect rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Sistema</h3>
                    <div id="system-status" class="w-4 h-4 rounded-full animate-pulse"></div>
                </div>
                <div class="text-center">
                    <div id="system-summary" class="text-sm">Carregando...</div>
                    <div class="mt-2 text-xs text-slate-400">
                        <div>CPU: <span id="cpu-avg">-</span>% (média)</div>
                        <div>Mem: <span id="mem-avg">-</span>% (média)</div>
                    </div>
                </div>
            </div>

            <!-- Banco de Dados -->
            <div class="metric-card glass-effect rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Banco de Dados</h3>
                    <div id="db-status" class="w-4 h-4 rounded-full animate-pulse"></div>
                </div>
                <div class="text-center">
                    <div id="db-summary" class="text-sm">Carregando...</div>
                    <div class="mt-2 text-xs text-slate-400">
                        <div>Response: <span id="db-response">-</span>ms</div>
                        <div>Tabelas: <span id="db-tables">-</span></div>
                    </div>
                </div>
            </div>

            <!-- Testes -->
            <div class="metric-card glass-effect rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Testes</h3>
                    <div id="test-status" class="w-4 h-4 rounded-full animate-pulse"></div>
                </div>
                <div class="text-center">
                    <div id="test-summary" class="text-sm">Carregando...</div>
                    <div class="mt-2 text-xs text-slate-400">
                        <div>Arquivos: <span id="test-files">-</span></div>
                        <div>Última: <span id="test-last">-</span></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Gráficos Históricos -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Gráfico do Sistema -->
            <div class="glass-effect rounded-xl p-6">
                <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
                    <i class="fas fa-chart-line"></i>
                    Performance do Sistema (24h)
                </h3>
                <canvas id="systemChart" width="400" height="200"></canvas>
            </div>

            <!-- Gráfico do Banco -->
            <div class="glass-effect rounded-xl p-6">
                <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
                    <i class="fas fa-database"></i>
                    Performance do Banco (24h)
                </h3>
                <canvas id="databaseChart" width="400" height="200"></canvas>
            </div>
        </div>

        <!-- Métricas Detalhadas -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Sistema Detalhado -->
            <div class="glass-effect rounded-xl p-6">
                <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
                    <i class="fas fa-microchip"></i>
                    Métricas do Sistema
                </h3>
                <div id="system-metrics" class="space-y-4">
                    <div class="animate-pulse">Carregando métricas...</div>
                </div>
            </div>

            <!-- Banco Detalhado -->
            <div class="glass-effect rounded-xl p-6">
                <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
                    <i class="fas fa-server"></i>
                    Status do Banco
                </h3>
                <div id="db-metrics" class="space-y-4">
                    <div class="animate-pulse">Carregando métricas...</div>
                </div>
            </div>

            <!-- Testes Detalhado -->
            <div class="glass-effect rounded-xl p-6">
                <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
                    <i class="fas fa-vial"></i>
                    Status dos Testes
                </h3>
                <div id="test-metrics" class="space-y-4">
                    <div class="animate-pulse">Carregando métricas...</div>
                </div>
            </div>

            <!-- Logs Detalhado -->
            <div class="glass-effect rounded-xl p-6">
                <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
                    <i class="fas fa-file-alt"></i>
                    Logs Recentes
                </h3>
                <div id="log-metrics" class="space-y-4">
                    <div class="animate-pulse">Carregando logs...</div>
                </div>
            </div>
        </div>

        <!-- Estatísticas Avançadas -->
        <div class="glass-effect rounded-xl p-6 mb-8">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-chart-bar"></i>
                Estatísticas da Última Hora
            </h3>
            <div id="advanced-stats" class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-400" id="peak-cpu">-</div>
                    <div class="text-sm text-slate-300">Pico CPU</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-400" id="peak-memory">-</div>
                    <div class="text-sm text-slate-300">Pico Memória</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-yellow-400" id="max-db-response">-</div>
                    <div class="text-sm text-slate-300">Max DB Response</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-red-400" id="total-errors">-</div>
                    <div class="text-sm text-slate-300">Total Erros</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let systemChart, databaseChart;
        let refreshInterval;
        let isDarkMode = true;

        // Inicializar
        document.addEventListener('DOMContentLoaded', function() {
            loadData();
            refreshInterval = setInterval(loadData, 30000); // Atualizar a cada 30s
        });

        async function loadData() {
            try {
                const response = await fetch('/api/monitor');
                const data = await response.json();
                updateDashboard(data);
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                showError('Erro ao conectar com o servidor');
            }
        }

        function updateDashboard(data) {
            // Status geral
            updateStatusIndicator('status-indicator', data.overall.status);
            document.getElementById('status-text').textContent = 
                data.overall.status === 'healthy' ? 'Saudável' :
                data.overall.status === 'warning' ? 'Atenção' : 'Erro';
            
            document.getElementById('uptime').textContent = formatUptime(data.overall.uptime);
            document.getElementById('version').textContent = data.overall.version;

            // Status dos componentes
            updateStatusIndicator('system-status', data.system.status);
            updateStatusIndicator('db-status', data.database.status);
            updateStatusIndicator('test-status', data.tests.status);

            // Resumos dos componentes
            updateSystemSummary(data.system);
            updateDatabaseSummary(data.database);
            updateTestSummary(data.tests);

            // Métricas detalhadas
            updateSystemMetrics(data.system);
            updateDatabaseMetrics(data.database);
            updateTestMetrics(data.tests);
            updateLogMetrics(data.logs);

            // Estatísticas avançadas
            updateAdvancedStats(data);

            // Alertas
            updateAlerts(data.alerts);

            // Gráficos
            updateCharts(data);
        }

        function updateStatusIndicator(selector, status) {
            const element = document.querySelector(selector);
            if (element) {
                element.className = 'w-4 h-4 rounded-full';
                element.classList.add(
                    status === 'healthy' ? 'status-healthy' :
                    status === 'warning' ? 'status-warning' : 'status-error'
                );
            }
        }

        function updateSystemSummary(system) {
            document.getElementById('system-summary').textContent = 
                system.status === 'healthy' ? 'Operacional' :
                system.status === 'warning' ? 'Atenção' : 'Crítico';
            
            document.getElementById('cpu-avg').textContent = system.stats?.avgCpu?.toFixed(1) || '-';
            document.getElementById('mem-avg').textContent = system.stats?.avgMemory?.toFixed(1) || '-';
        }

        function updateDatabaseSummary(db) {
            document.getElementById('db-summary').textContent = 
                db.status === 'healthy' ? 'Conectado' :
                db.status === 'warning' ? 'Lento' : 'Erro';
            
            document.getElementById('db-response').textContent = db.responseTime || '-';
            document.getElementById('db-tables').textContent = db.tables?.count || '-';
        }

        function updateTestSummary(tests) {
            document.getElementById('test-summary').textContent = 
                tests.status === 'healthy' ? 'Disponível' :
                tests.status === 'warning' ? 'Parcial' : 'Erro';
            
            document.getElementById('test-files').textContent = tests.testFiles?.length || '-';
            document.getElementById('test-last').textContent = tests.lastRun ? 
                new Date(tests.lastRun).toLocaleTimeString() : 'Nunca';
        }

        function updateSystemMetrics(system) {
            const container = document.getElementById('system-metrics');
            container.innerHTML = \`
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-white/5 rounded-lg p-4">
                        <div class="text-sm text-slate-300">CPU Atual</div>
                        <div class="text-2xl font-bold">\${system.cpu.usage.toFixed(1)}%</div>
                        <div class="text-xs text-slate-400">\${system.cpu.cores} cores</div>
                    </div>
                    <div class="bg-white/5 rounded-lg p-4">
                        <div class="text-sm text-slate-300">Memória Atual</div>
                        <div class="text-2xl font-bold">\${system.memory.usage.toFixed(1)}%</div>
                        <div class="text-xs text-slate-400">\${formatBytes(system.memory.used)} / \${formatBytes(system.memory.total)}</div>
                    </div>
                </div>
                <div class="text-sm text-slate-300 space-y-1">
                    <div>Uptime: \${formatUptime(system.uptime)}</div>
                    <div>Plataforma: \${system.platform}</div>
                    <div>Node: \${system.nodeVersion}</div>
                </div>
                \${system.warnings.length > 0 ? \`
                    <div class="mt-4 p-3 bg-yellow-500/20 rounded-lg">
                        <div class="text-sm font-medium text-yellow-300">⚠️ Avisos:</div>
                        <ul class="text-xs text-yellow-200 mt-1">
                            \${system.warnings.map(w => \`<li>• \${w}</li>\`).join('')}
                        </ul>
                    </div>
                \` : ''}
            \`;
        }

        function updateDatabaseMetrics(db) {
            const container = document.getElementById('db-metrics');
            container.innerHTML = \`
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-white/5 rounded-lg p-4">
                        <div class="text-sm text-slate-300">Conexão</div>
                        <div class="text-2xl font-bold">\${db.connected ? '✅' : '❌'}</div>
                        <div class="text-xs text-slate-400">\${db.responseTime}ms</div>
                    </div>
                    <div class="bg-white/5 rounded-lg p-4">
                        <div class="text-sm text-slate-300">Tabelas</div>
                        <div class="text-2xl font-bold">\${db.tables.count}</div>
                        <div class="text-xs text-slate-400">tabelas encontradas</div>
                    </div>
                </div>
                \${db.errors.length > 0 ? \`
                    <div class="mt-4 p-3 bg-red-500/20 rounded-lg">
                        <div class="text-sm font-medium text-red-300">❌ Erros:</div>
                        <ul class="text-xs text-red-200 mt-1">
                            \${db.errors.map(e => \`<li>• \${e}</li>\`).join('')}
                        </ul>
                    </div>
                \` : ''}
            \`;
        }

        function updateTestMetrics(tests) {
            const container = document.getElementById('test-metrics');
            container.innerHTML = \`
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-white/5 rounded-lg p-4">
                        <div class="text-sm text-slate-300">Arquivos</div>
                        <div class="text-2xl font-bold">\${tests.testFiles.length}</div>
                        <div class="text-xs text-slate-400">arquivos de teste</div>
                    </div>
                    <div class="bg-white/5 rounded-lg p-4">
                        <div class="text-sm text-slate-300">Última Execução</div>
                        <div class="text-lg font-bold">\${tests.lastRun ? new Date(tests.lastRun).toLocaleString() : 'Nunca'}</div>
                    </div>
                </div>
                \${tests.errors.length > 0 ? \`
                    <div class="mt-4 p-3 bg-red-500/20 rounded-lg">
                        <div class="text-sm font-medium text-red-300">❌ Erros:</div>
                        <ul class="text-xs text-red-200 mt-1">
                            \${tests.errors.map(e => \`<li>• \${e}</li>\`).join('')}
                        </ul>
                    </div>
                \` : ''}
            \`;
        }

        function updateLogMetrics(logs) {
            const container = document.getElementById('log-metrics');
            container.innerHTML = \`
                <div class="grid grid-cols-3 gap-4 mb-4">
                    <div class="bg-white/5 rounded-lg p-3 text-center">
                        <div class="text-lg font-bold text-green-400">\${logs.logStats.info}</div>
                        <div class="text-xs text-slate-300">Info</div>
                    </div>
                    <div class="bg-white/5 rounded-lg p-3 text-center">
                        <div class="text-lg font-bold text-yellow-400">\${logs.logStats.warnings}</div>
                        <div class="text-xs text-slate-300">Warnings</div>
                    </div>
                    <div class="bg-white/5 rounded-lg p-3 text-center">
                        <div class="text-lg font-bold text-red-400">\${logs.logStats.errors}</div>
                        <div class="text-xs text-slate-300">Erros</div>
                    </div>
                </div>
                <div class="max-h-40 overflow-y-auto space-y-2">
                    \${logs.recentLogs.slice(0, 10).map(log => \`
                        <div class="text-xs p-2 rounded \${log.level === 'error' ? 'bg-red-500/20' : log.level === 'warn' ? 'bg-yellow-500/20' : 'bg-white/5'}">
                            <div class="flex justify-between">
                                <span class="font-medium">\${log.level.toUpperCase()}</span>
                                <span class="text-slate-400">\${new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div class="text-slate-300 truncate">\${log.message}</div>
                        </div>
                    \`).join('')}
                </div>
            \`;
        }

        function updateAdvancedStats(data) {
            document.getElementById('peak-cpu').textContent = data.system.stats?.peakCpu?.toFixed(1) + '%' || '-';
            document.getElementById('peak-memory').textContent = data.system.stats?.peakMemory?.toFixed(1) + '%' || '-';
            document.getElementById('max-db-response').textContent = data.database.stats?.maxResponseTime?.toFixed(0) + 'ms' || '-';
            document.getElementById('total-errors').textContent = data.logs.stats?.totalErrors || '-';
        }

        function updateAlerts(alerts) {
            const container = document.getElementById('alerts-container');
            const badge = document.getElementById('alert-badge');
            
            if (alerts.length > 0) {
                badge.classList.remove('hidden');
                container.innerHTML = \`
                    <div class="space-y-2">
                        \${alerts.map(alert => \`
                            <div class="\${alert.type === 'error' ? 'bg-red-500/20 border-red-500' : 'bg-yellow-500/20 border-yellow-500'} border rounded-lg p-3">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-\${alert.type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'} text-\${alert.type === 'error' ? 'red' : 'yellow'}-400"></i>
                                    <span class="font-medium">\${alert.message}</span>
                                    <span class="text-xs text-slate-400 ml-auto">\${new Date(alert.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                \`;
            } else {
                badge.classList.add('hidden');
                container.innerHTML = '';
            }
        }

        function updateCharts(data) {
            // Gráfico do sistema
            const systemCtx = document.getElementById('systemChart');
            if (systemChart) systemChart.destroy();
            
            const systemLabels = data.system.history?.map((_, i) => \`\${i * 5}m\`) || [];
            const systemData = data.system.history || [];
            
            systemChart = new Chart(systemCtx, {
                type: 'line',
                data: {
                    labels: systemLabels,
                    datasets: [{
                        label: 'CPU (%)',
                        data: systemData.map(p => p.cpu),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Memória (%)',
                        data: systemData.map(p => p.memory),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { 
                            display: true,
                            labels: { color: '#94a3b8' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: {
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });

            // Gráfico do banco
            const dbCtx = document.getElementById('databaseChart');
            if (databaseChart) databaseChart.destroy();
            
            const dbLabels = data.database.history?.map((_, i) => \`\${i * 5}m\`) || [];
            const dbData = data.database.history || [];
            
            databaseChart = new Chart(dbCtx, {
                type: 'line',
                data: {
                    labels: dbLabels,
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: dbData.map(p => p.dbResponseTime),
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { 
                            display: true,
                            labels: { color: '#94a3b8' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: {
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });
        }

        function refreshData() {
            loadData();
        }

        async function runTests() {
            try {
                const button = event.target;
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executando...';
                button.disabled = true;

                const response = await fetch('/api/monitor/tests/run', { method: 'POST' });
                const result = await response.json();

                if (result.success) {
                    showSuccess('Testes executados com sucesso!');
                    setTimeout(loadData, 2000); // Recarregar dados após 2s
                } else {
                    showError('Erro ao executar testes: ' + result.error);
                }
            } catch (error) {
                showError('Erro ao executar testes: ' + error.message);
            } finally {
                const button = event.target;
                button.innerHTML = originalText;
                button.disabled = false;
            }
        }

        function toggleDarkMode() {
            isDarkMode = !isDarkMode;
            document.body.classList.toggle('dark-mode');
            const icon = event.target.querySelector('i');
            icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        }

        function showSuccess(message) {
            // Implementar notificação de sucesso
            console.log('✅ ' + message);
        }

        function showError(message) {
            // Implementar notificação de erro
            console.error('❌ ' + message);
        }

        function formatUptime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return \`\${hours}h \${minutes}m\`;
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
    </script>
</body>
</html>
`;

export async function GET(): Promise<globalThis.Response> {
  return new globalThis.Response(DASHBOARD_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
} 