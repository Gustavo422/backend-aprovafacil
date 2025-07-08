/* global Request */
import { NextResponse } from 'next/server';

// Mock das dependências para testes
let supabase: unknown;
let logger: unknown;

// Função para configurar as dependências (usada em testes)
export function setupDependencies(supabaseClient: unknown, loggerClient: unknown) {
  supabase = supabaseClient;
  logger = loggerClient;
}

// ========================================
// GET - Buscar preferência do usuário
// ========================================

export async function GET() {
  try {
    // Verificar se o usuário está autenticado
    const supabaseAuth = supabase as unknown as {
      auth: { getUser: () => Promise<{ data: { user: unknown } }> };
    };
    
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar preferência ativa do usuário
    const supabaseClient = supabase as unknown as {
      from: (table: string) => {
        select: (fields: string) => {
          eq: (field: string, value: unknown) => {
            eq: (field: string, value: unknown) => {
              single: () => Promise<{ data: unknown, error: unknown }>;
            };
          };
        };
      };
    };
    
    const { data: preference, error } = await supabaseClient
      .from('user_concurso_preferences')
      .select('*')
      .eq('user_id', (user as { id: string }).id)
      .eq('is_active', true)
      .single();

    if (error) {
      if ((error as { code: string }).code === 'PGRST116') {
        // Nenhuma preferência encontrada
        return NextResponse.json({ error: 'Preferência não encontrada' }, { status: 404 });
      }
      
      const loggerClient = logger as unknown as {
        error: (message: string, data: unknown) => void;
      };
      
      loggerClient.error('Erro ao buscar preferência do usuário:', {
        error: (error as { message: string }).message,
        userId: (user as { id: string }).id,
      });
      return NextResponse.json(
        { error: 'Erro ao buscar preferência' },
        { status: 500 }
      );
    }

    // Calcular se pode trocar de concurso
    const now = new Date();
    const canChangeUntil = new Date((preference as { can_change_until: string }).can_change_until);
    const canChange = now >= canChangeUntil;
    const daysUntilChange = Math.max(0, Math.ceil((canChangeUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      data: preference,
      canChange,
      daysUntilChange,
    });
  } catch (error) {
    const loggerClient = logger as unknown as {
      error: (message: string, data: unknown) => void;
    };
    
    loggerClient.error('Erro interno:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ========================================
// POST - Criar/Atualizar preferência do usuário
// ========================================

export async function POST(request: Request) {
  try {
    // Verificar se o usuário está autenticado
    const supabaseAuth = supabase as unknown as {
      auth: { getUser: () => Promise<{ data: { user: unknown } }> };
    };
    
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Obter dados da requisição
    const body = await request.json();
    const { concurso_id } = body as { concurso_id: string };

    if (!concurso_id) {
      return NextResponse.json(
        { error: 'ID do concurso é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o concurso existe e está ativo
    const supabaseClient = supabase as unknown as {
      from: (table: string) => {
        select: (fields: string) => {
          eq: (field: string, value: unknown) => {
            eq: (field: string, value: unknown) => {
              single: () => Promise<{ data: unknown, error: unknown }>;
            };
          };
        };
      };
    };
    
    const { data: concurso, error: concursoError } = await supabaseClient
      .from('concursos')
      .select('*')
      .eq('id', concurso_id)
      .eq('is_active', true)
      .single();

    if (concursoError || !concurso) {
      return NextResponse.json(
        { error: 'Concurso não encontrado ou inativo' },
        { status: 404 }
      );
    }

    // Verificar se já existe uma preferência ativa
    const { data: existingPreference, error: existingError } = await supabaseClient
      .from('user_concurso_preferences')
      .select('*')
      .eq('user_id', (user as { id: string }).id)
      .eq('is_active', true)
      .single();

    if (existingError && (existingError as { code: string }).code !== 'PGRST116') {
      const loggerClient = logger as unknown as {
        error: (message: string, data: unknown) => void;
      };
      
      loggerClient.error('Erro ao verificar preferência existente:', {
        error: (existingError as { message: string }).message,
        userId: (user as { id: string }).id,
      });
      return NextResponse.json(
        { error: 'Erro ao verificar preferência existente' },
        { status: 500 }
      );
    }

    // Calcular data de troca permitida (4 meses)
    const now = new Date();
    const canChangeUntil = new Date(now.getTime() + (4 * 30 * 24 * 60 * 60 * 1000)); // 4 meses

    if (existingPreference) {
      // Verificar se pode trocar de concurso
      const canChange = now >= new Date((existingPreference as { can_change_until: string }).can_change_until);
      
      if (!canChange) {
        const daysUntilChange = Math.ceil(
          (new Date((existingPreference as { can_change_until: string }).can_change_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return NextResponse.json({
          error: 'Você só pode trocar de concurso após 4 meses',
          daysUntilChange,
          canChangeUntil: (existingPreference as { can_change_until: string }).can_change_until,
        }, { status: 403 });
      }

      // Desativar preferência atual
      const supabaseUpdate = supabase as unknown as {
        from: (table: string) => {
          update: (data: unknown) => {
            eq: (field: string, value: unknown) => Promise<{ error: unknown }>;
          };
        };
      };
      
      const { error: deactivateError } = await supabaseUpdate
        .from('user_concurso_preferences')
        .update({ is_active: false })
        .eq('id', (existingPreference as { id: string }).id);

      if (deactivateError) {
        const loggerClient = logger as unknown as {
          error: (message: string, data: unknown) => void;
        };
        
        loggerClient.error('Erro ao desativar preferência existente:', {
          error: (deactivateError as { message: string }).message,
          preferenceId: (existingPreference as { id: string }).id,
        });
        return NextResponse.json(
          { error: 'Erro ao atualizar preferência' },
          { status: 500 }
        );
      }
    }

    // Criar nova preferência
    const supabaseInsert = supabase as unknown as {
      from: (table: string) => {
        insert: (data: unknown) => {
          select: () => {
            single: () => Promise<{ data: unknown, error: unknown }>;
          };
        };
      };
    };
    
    const { data: newPreference, error: createError } = await supabaseInsert
      .from('user_concurso_preferences')
      .insert({
        user_id: (user as { id: string }).id,
        concurso_id: concurso_id,
        can_change_until: canChangeUntil.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      const loggerClient = logger as unknown as {
        error: (message: string, data: unknown) => void;
      };
      
      loggerClient.error('Erro ao criar preferência:', {
        error: (createError as { message: string }).message,
        userId: (user as { id: string }).id,
        concursoId: concurso_id,
      });
      return NextResponse.json(
        { error: 'Erro ao criar preferência' },
        { status: 500 }
      );
    }

    // Log da ação
    const loggerClient = logger as unknown as {
      info: (message: string, data: unknown) => void;
    };
    
    loggerClient.info('Preferência de concurso criada/atualizada:', {
      userId: (user as { id: string }).id,
      concursoId: concurso_id,
      canChangeUntil: canChangeUntil.toISOString(),
    });

    return NextResponse.json({
      message: 'Preferência de concurso definida com sucesso',
      data: newPreference,
      canChangeUntil: canChangeUntil.toISOString(),
    });
  } catch (error) {
    const loggerClient = logger as unknown as {
      error: (message: string, data: unknown) => void;
    };
    
    loggerClient.error('Erro interno:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ========================================
// PUT - Atualizar preferência do usuário
// ========================================

export async function PUT(request: Request) {
  try {
    // Verificar se o usuário está autenticado
    const supabaseAuth = supabase as unknown as {
      auth: { getUser: () => Promise<{ data: { user: unknown } }> };
    };
    
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Obter dados da requisição
    const body = await request.json();

    // Buscar preferência ativa do usuário
    const supabaseClient = supabase as unknown as {
      from: (table: string) => {
        select: (fields: string) => {
          eq: (field: string, value: unknown) => {
            eq: (field: string, value: unknown) => {
              single: () => Promise<{ data: unknown, error: unknown }>;
            };
          };
        };
      };
    };
    
    const { data: preference, error: fetchError } = await supabaseClient
      .from('user_concurso_preferences')
      .select('*')
      .eq('user_id', (user as { id: string }).id)
      .eq('is_active', true)
      .single();

    if (fetchError) {
      if ((fetchError as { code: string }).code === 'PGRST116') {
        return NextResponse.json({ error: 'Preferência não encontrada' }, { status: 404 });
      }
      
      const loggerClient = logger as unknown as {
        error: (message: string, data: unknown) => void;
      };
      
      loggerClient.error('Erro ao buscar preferência:', {
        error: (fetchError as { message: string }).message,
        userId: (user as { id: string }).id,
      });
      return NextResponse.json(
        { error: 'Erro ao buscar preferência' },
        { status: 500 }
      );
    }

    // Atualizar preferência
    const supabaseUpdate = supabase as unknown as {
      from: (table: string) => {
        update: (data: unknown) => {
          eq: (field: string, value: unknown) => {
            select: () => {
              single: () => Promise<{ data: unknown, error: unknown }>;
            };
          };
        };
      };
    };
    
    const { data: updatedPreference, error: updateError } = await supabaseUpdate
      .from('user_concurso_preferences')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (preference as { id: string }).id)
      .select()
      .single();

    if (updateError) {
      const loggerClient = logger as unknown as {
        error: (message: string, data: unknown) => void;
      };
      
      loggerClient.error('Erro ao atualizar preferência:', {
        error: (updateError as { message: string }).message,
        preferenceId: (preference as { id: string }).id,
      });
      return NextResponse.json(
        { error: 'Erro ao atualizar preferência' },
        { status: 500 }
      );
    }

    // Log da ação
    const loggerClient = logger as unknown as {
      info: (message: string, data: unknown) => void;
    };
    
    loggerClient.info('Preferência atualizada:', {
      userId: (user as { id: string }).id,
      preferenceId: (preference as { id: string }).id,
      updates: body,
    });

    return NextResponse.json({
      message: 'Preferência atualizada com sucesso',
      data: updatedPreference,
    });
  } catch (error) {
    const loggerClient = logger as unknown as {
      error: (message: string, data: unknown) => void;
    };
    
    loggerClient.error('Erro interno:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
