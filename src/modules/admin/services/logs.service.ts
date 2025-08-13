import type { ApiResponse } from '../../../shared/types/index.js';
import type { AdminContext } from '../context.js';

export class LogsAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async obterLogs(filtro?: unknown): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('obterLogsAdmin', { filtro });
      const logs = await this.ctx.logService.obterLogs(filtro);
      const estatisticasLogs = await this.ctx.logService.obterEstatisticasLogs();
      const resultado = { logs: logs.logs, total: logs.total, estatisticas: estatisticasLogs, filtros_aplicados: filtro ?? {} };
      await this.ctx.logService.logarFimOperacao('obterLogsAdmin', true);
      return { success: true, data: resultado, message: 'Logs obtidos' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter logs', error as Error, { filtro });
      throw error;
    }
  }
}

export default LogsAdminService;


