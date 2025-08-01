// backend/src/config/environment.ts
import dotenv from 'dotenv';

dotenv.config();

/**
 * Valida as variáveis de ambiente essenciais para a aplicação.
 * Garante que todas as chaves, segredos e URLs necessários estão presentes e,
 * em alguns casos, que possuem um formato minimamente seguro.
 *
 * @throws {Error} Lança um erro se uma variável obrigatória estiver ausente
 * ou se uma chave de segurança for muito curta, interrompendo a inicialização.
 */
export const validateEnvironment = () => {
  const requiredVariables = [
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'DATABASE_URL',
    'PGPASSWORD',
  ];

  const missingVariables = requiredVariables.filter(v => !process.env[v]);

  if (missingVariables.length > 0) {
    throw new Error(`Variáveis de ambiente ausentes: ${missingVariables.join(', ')}`);
  }

  // Validação de comprimento mínimo para segredos
  const securityKeys = ['JWT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'];
  for (const key of securityKeys) {
    const value = process.env[key];
    if (value && value.length < 32) {
      throw new Error(`A variável de ambiente ${key} é muito curta e insegura.`);
    }
  }
}; 