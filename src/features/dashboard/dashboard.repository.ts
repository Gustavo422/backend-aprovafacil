// Repository de Dashboard - refatoração SOLID
import { DashboardDTO } from '../../types/dashboard.dto';

export class DashboardRepository {
  async fetchStats(): Promise<DashboardDTO> {
    // TODO: Implementar acesso ao banco
    return { resumo: '', stats: {} };
  }

  async fetchUserStats(): Promise<DashboardDTO> {
    // TODO: Implementar acesso ao banco
    return { resumo: '', stats: {} };
  }

  async fetchResumo(): Promise<string> {
    // TODO: Implementar acesso ao banco
    return '';
  }
} 