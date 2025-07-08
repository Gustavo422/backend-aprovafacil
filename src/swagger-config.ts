import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AprovaFácil API',
      description: 'API completa para sistema de estudos e preparação para concursos públicos',
      version: '1.0.0',
      contact: {
        name: 'AprovaFacil Team',
        email: 'contato@aprovafacil.com',
        url: 'https://aprovafacil.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Servidor de desenvolvimento'
      },
      {
        url: 'https://api.aprovafacil.com',
        description: 'Servidor de produção'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido através do login'
        }
      },
      schemas: {
        // Schemas baseados no Supabase
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', format: 'email', example: 'usuario@exemplo.com' },
            nome: { type: 'string', example: 'João Silva' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            total_questions_answered: { type: 'integer', default: 0 },
            total_correct_answers: { type: 'integer', default: 0 },
            study_time_minutes: { type: 'integer', default: 0 },
            average_score: { type: 'number', default: 0 },
            avatar_url: { type: 'string', nullable: true },
            is_active: { type: 'boolean', default: true },
            last_login: { type: 'string', format: 'date-time', nullable: true }
          },
          required: ['email']
        },
        Concurso: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string', example: 'Concurso Polícia Federal 2024' },
            descricao: { type: 'string' },
            ano: { type: 'integer', example: 2024 },
            banca: { type: 'string', example: 'CESPE/CEBRASPE' },
            is_active: { type: 'boolean', default: true },
            categoria_id: { type: 'string', format: 'uuid' },
            edital_url: { type: 'string' },
            data_prova: { type: 'string', format: 'date' },
            vagas: { type: 'integer' },
            salario: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['nome']
        },
        UserConcursoPreference: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            concurso_id: { type: 'string', format: 'uuid' },
            selected_at: { type: 'string', format: 'date-time' },
            can_change_until: { type: 'string', format: 'date-time' },
            is_active: { type: 'boolean', default: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['user_id', 'concurso_id', 'can_change_until']
        },
        Simulado: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            titulo: { type: 'string', example: 'Simulado Polícia Federal - Direito Constitucional' },
            descricao: { type: 'string' },
            num_questoes: { type: 'integer', default: 0 },
            tempo_minutos: { type: 'integer', default: 60 },
            dificuldade: { type: 'string', enum: ['Fácil', 'Médio', 'Difícil'], default: 'Médio' },
            is_public: { type: 'boolean', default: true },
            is_active: { type: 'boolean', default: true },
            data_inicio: { type: 'string', format: 'date-time' },
            data_fim: { type: 'string', format: 'date-time' },
            created_by: { type: 'string', format: 'uuid' },
            concurso_id: { type: 'string', format: 'uuid' },
            categoria_id: { type: 'string', format: 'uuid' },
            disciplinas: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['titulo']
        },
        Flashcard: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            front: { type: 'string', example: 'Qual é a capital do Brasil?' },
            back: { type: 'string', example: 'Brasília' },
            disciplina: { type: 'string', example: 'Geografia' },
            tema: { type: 'string', example: 'Capitais' },
            subtema: { type: 'string' },
            concurso_id: { type: 'string', format: 'uuid' },
            categoria_id: { type: 'string', format: 'uuid' },
            peso_disciplina: { type: 'integer' },
            is_active: { type: 'boolean', default: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['front', 'back', 'disciplina', 'tema']
        },
        PlanoEstudo: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            nome: { type: 'string', example: 'Plano de Estudos PF 2024' },
            descricao: { type: 'string' },
            is_active: { type: 'boolean', default: true },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            concurso_id: { type: 'string', format: 'uuid' },
            categoria_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['user_id', 'nome', 'start_date', 'end_date']
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Mensagem de erro' },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            details: { type: 'object' }
          },
          required: ['error']
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operação realizada com sucesso' },
            data: { type: 'object' }
          },
          required: ['success']
        }
      }
    },
    tags: [
      { name: 'Autenticação', description: 'Endpoints de autenticação e autorização' },
      { name: 'Usuários', description: 'Gerenciamento de usuários' },
      { name: 'Concursos', description: 'Gerenciamento de concursos' },
      { name: 'Preferências', description: 'Preferências de usuário por concurso' },
      { name: 'Simulados', description: 'Gerenciamento de simulados' },
      { name: 'Flashcards', description: 'Sistema de flashcards' },
      { name: 'Planos de Estudo', description: 'Gerenciamento de planos de estudo' },
      { name: 'Estatísticas', description: 'Estatísticas e relatórios' },
      { name: 'Sistema', description: 'Endpoints do sistema' }
    ]
  },
  apis: [
    './src/api/**/*.ts',
    './src/api/**/*.js',
    './src/index.ts',
    './src/docs.ts'
  ]
};

export const specs = swaggerJsdoc(options); 