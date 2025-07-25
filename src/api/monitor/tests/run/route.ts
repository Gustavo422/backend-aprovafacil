import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';
import { registerTestRun } from '../../../../utils/test-history';
import { Request, Response } from 'express';

const execAsync = promisify(exec);

// Função utilitária para validar o caminho do arquivo de teste
function isValidTestFile(file: string): boolean {
  // Só permite arquivos dentro de 'src/' ou 'tests/' e terminando com .test.ts
  return (
    (file.startsWith('src/') || file.startsWith('tests/')) &&
    file.endsWith('.test.ts') &&
    !file.includes('..')
  );
}

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request, res: Response) {
  // Autenticação manual para Next.js API Route
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticação necessário',
      timestamp: new Date().toISOString()
    });
  }
  const token = authHeader.substring(7);
  // Verificar token no Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticação inválido',
      timestamp: new Date().toISOString()
    });
  }
  // Buscar perfil do usuário
  const { data: userProfile, error: profileError } = await supabase
    .from('usuarios')
    .select('id, email, role, nome')
    .eq('id', user.id)
    .single();
  if (profileError || !userProfile) {
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar perfil do usuário',
      timestamp: new Date().toISOString()
    });
  }
  if (userProfile.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado. Permissão de administrador necessária.',
      timestamp: new Date().toISOString()
    });
  }

  try {
    let command = 'npx vitest run';
    let file = '';
    let testnome = '';

    if (req.body) {
      file = req.body.file || '';
      testnome = req.body.testnome || '';
    }

    if (file) {
      if (!isValidTestFile(file)) {
        return res.status(400).json({
          success: false,
          error: 'Arquivo de teste inválido',
          timestamp: new Date().toISOString()
        });
      }
      command += ` ${file}`;
    }

    if (testnome) {
      // Escapar aspas duplas
      const safeTestnome = testnome.replace(/"/g, '');
      command += ` -t "${safeTestnome}"`;
    }

    // Executar testes com Vitest
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 60000 // 60 segundos timeout
    });

    // Parsear resultados do Vitest
    const results = parseVitestOutput(stdout, stderr);

    // Após obter o resultado do teste:
    await registerTestRun({
      user_id: userProfile.id,
      user_email: userProfile.email,
      file,
      test_nome: testnome,
      status: results.failed > 0 ? 'failed' : 'passed',
      duration: results.duration,
      output: results.output,
      error: results.errors
    });

    return res.status(200).json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao executar testes:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
}

function parseVitestOutput(stdout: string, stderr: string) {
  const lines = stdout.split('\n');
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let duration = 0;

  // Procurar por padrões de resultado do Vitest
  for (const line of lines) {
    // Padrão: "✓ 3 tests passed in 1.2s"
    const passedMatch = line.match(/(\d+)\s+tests?\s+passed/);
    if (passedMatch) {
      passed = parseInt(passedMatch[1]);
    }

    // Padrão: "✗ 1 test failed"
    const failedMatch = line.match(/(\d+)\s+tests?\s+failed/);
    if (failedMatch) {
      failed = parseInt(failedMatch[1]);
    }

    // Padrão: "Test Files  1 passed | 1 total"
    const totalMatch = line.match(/Test Files\s+(\d+)\s+passed\s+\|\s+(\d+)\s+total/);
    if (totalMatch) {
      passed = parseInt(totalMatch[1]);
      const total = parseInt(totalMatch[2]);
      failed = total - passed;
    }

    // Padrão: "Duration: 1.2s"
    const durationMatch = line.match(/Duration:\s+([\d.]+)s/);
    if (durationMatch) {
      duration = parseFloat(durationMatch[1]);
    }
  }

  return {
    passed,
    failed,
    skipped,
    total: passed + failed + skipped,
    duration,
    output: stdout,
    errors: stderr
  };
} 



