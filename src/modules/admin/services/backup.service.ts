import type { ApiResponse } from '../../../shared/types/index.js';
import type { AdminContext } from '../context.js';

export class BackupAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async executarBackup(): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('executarBackup');
      const backup = {
        timestamp: new Date().toISOString(),
        versao: '1.0',
        dados: {
          categorias_concursos: await this.exportarTabela('categorias_concursos'),
          concursos: await this.exportarTabela('concursos'),
          simulados: await this.exportarTabela('simulados'),
          questoes_simulado: await this.exportarTabela('questoes_simulado'),
          questoes_semanais: await this.exportarTabela('questoes_semanais'),
          cartoes_memorizacao: await this.exportarTabela('cartoes_memorizacao'),
          apostilas: await this.exportarTabela('apostilas'),
          conteudo_apostila: await this.exportarTabela('conteudo_apostila'),
          mapa_assuntos: await this.exportarTabela('mapa_assuntos'),
        },
      } as const;

      const { data, error } = await this.ctx.supabase
        .from('backups_sistema')
        .insert({ nome: `backup_${new Date().toISOString().split('T')[0]}`, dados_backup: backup, criado_em: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      await this.ctx.logService.logarFimOperacao('executarBackup', true);
      return { success: true, data, message: 'Backup executado com sucesso' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao executar backup', error as Error);
      throw error;
    }
  }

  async restaurarBackup(dados: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('restaurarBackup');
      await this.ctx.logService.aviso('Tentativa de restauração de backup', { dados });
      return { success: false, data: null, message: 'Restauração de backup deve ser implementada com cuidado especial' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao restaurar backup', error as Error);
      throw error;
    }
  }

  private async exportarTabela(tabela: string): Promise<unknown[]> {
    try {
      const { data } = await this.ctx.supabase.from(tabela).select('*');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
}

export default BackupAdminService;


