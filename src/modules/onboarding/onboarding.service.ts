import { supabase } from '../../config/supabase-unified.js';
import { LogService } from '../../core/utils/log.service.js';

export async function onboardingHandler(param: string) {
  const { data, error } = await supabase
    .from('onboarding_respostas')
    .select('id')
    .eq('usuario_auth_usuario_id', param)
    .single();
  if (error && error.code !== 'PGRST116') {
    this.logService.erro('Erro ao verificar onboarding', error, { error: error.message });
    throw error;
  }
  return !data;
}

export interface OnboardingData {
  concurso_id: string;
  horas_disponiveis: number;
  tempo_falta_concurso: string;
  nivel_preparacao: string;
  niveis_materias?: unknown;
}

export class OnboardingService {
  private logService: LogService;

  constructor(logService: LogService) {
    this.logService = logService;
  }

  /**
   * Verifica se o usuário precisa passar pelo onboarding.
   * A lógica agora se baseia no campo 'primeiro_login' da tabela 'usuarios'.
   *
   * @param usuarioId - O ID do usuário da tabela 'usuarios'.
   * @returns True se o onboarding for necessário, caso contrário, false.
   */
  async requireOnboarding(usuarioId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('primeiro_login')
        .eq('id', usuarioId)
        .single();

      if (error) {
        this.logService.erro('Erro ao verificar status de onboarding do usuário', error, { usuarioId });
        return false; // Em caso de erro, assume que não precisa de onboarding para não bloquear o usuário
      }

      return data?.primeiro_login ?? false;
    } catch (error) {
      this.logService.erro('Exceção ao verificar onboarding', error as Error, { usuarioId });
      return false;
    }
  }

  /**
   * Salva as respostas do onboarding para um usuário.
   *
   * @param usuarioId - O ID do usuário.
   * @param onboardingData - Os dados do onboarding a serem salvos.
   * @returns True se os dados foram salvos com sucesso, caso contrário, false.
   */
  async saveOnboarding(usuarioId: string, respostas: OnboardingData): Promise<void> {
    try {
      const { error } = await supabase
        .from('onboarding_respostas')
        .insert({ ...respostas, usuario_id: usuarioId });

      if (error) {
        this.logService.erro('Erro ao salvar respostas do onboarding', error, { usuarioId });
        throw new Error('Não foi possível salvar as respostas do onboarding.');
      }

      try {
        await supabase
          .from('usuarios')
          .update({ primeiro_login: false })
          .eq('id', usuarioId);
      } catch (error) {
        this.logService.erro('Exceção ao salvar onboarding', error as Error, { usuarioId });
        // Não relança o erro para não quebrar a experiência do usuário se a primeira parte funcionou
      }
    } catch (error) {
      this.logService.erro('Exceção ao salvar onboarding', error as Error, { usuarioId });
    }
  }
} 