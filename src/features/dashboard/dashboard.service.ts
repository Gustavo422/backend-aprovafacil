// Service de Dashboard - refatoração SOLID
import { DashboardDTO } from '../../types/dashboard.dto';

export class DashboardService {
  async getStats(): Promise<DashboardDTO> {
    // TODO: Implementar lógica de estatísticas gerais
    return { resumo: '', stats: {} };
  }

  async getUserStats(): Promise<DashboardDTO> {
    // TODO: Implementar lógica de estatísticas do usuário
    return { resumo: '', stats: {} };
  }

  async getResumo(): Promise<string> {
    // TODO: Implementar lógica de resumo
    return '';
  }
} 