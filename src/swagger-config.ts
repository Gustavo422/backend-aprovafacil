import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      titulo: 'AprovaFácil API',
      descricao: 'API completa para sistema de estudos e preparação para concursos públicos',
      version: '1.0.0',
      contact: {
        nome: 'AprovaFacil Team',
        email: 'contato@aprovafacil.com',
        url: 'https://aprovafacil.com',
      },
      license: {
        nome: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        descricao: 'Servidor de desenvolvimento',
      },
      {
        url: 'https://api.aprovafacil.com',
        descricao: 'Servidor de produção',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          descricao: 'Token JWT obtido através do login',
        },
      },
      schemas: {
        // Schemas baseados no Supabase
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', format: 'email', example: 'usuario@exemplo.com' },
            nome: { type: 'string', example: 'João Silva' },
            criado_em: { type: 'string', format: 'date-time' },
            atualizado_em: { type: 'string', format: 'date-time' },
            total_questoes_respondidas: { type: 'integer', default: 0 },
            total_resposta_corretas: { type: 'integer', default: 0 },
            tempo_estudo_minutos: { type: 'integer', default: 0 },
            pontuacao_media: { type: 'number', default: 0 },
            avatar_url: { type: 'string', nullable: true },
            ativo: { type: 'boolean', default: true },
            ultimo_login: { type: 'string', format: 'date-time', nullable: true },
          },
          required: ['email'],
        },
        Concurso: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string', example: 'Concurso Polícia Federal 2024' },
            descricao: { type: 'string' },
            ano: { type: 'integer', example: 2024 },
            banca: { type: 'string', example: 'CESPE/CEBRASPE' },
            ativo: { type: 'boolean', default: true },
            categoria_id: { type: 'string', format: 'uuid' },
            edital_url: { type: 'string' },
            data_prova: { type: 'string', format: 'date' },
            vagas: { type: 'integer' },
            salario: { type: 'number' },
            criado_em: { type: 'string', format: 'date-time' },
            atualizado_em: { type: 'string', format: 'date-time' },
          },
          required: ['nome'],
        },
        UserConcursoPreference: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            usuario_id: { type: 'string', format: 'uuid' },
            concurso_id: { type: 'string', format: 'uuid' },
            selecionado_em: { type: 'string', format: 'date-time' },
            pode_alterar_ate: { type: 'string', format: 'date-time' },
            ativo: { type: 'boolean', default: true },
            criado_em: { type: 'string', format: 'date-time' },
            atualizado_em: { type: 'string', format: 'date-time' },
          },
          required: ['usuario_id', 'concurso_id', 'pode_alterar_ate'],
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
            ativo: { type: 'boolean', default: true },
            data_inicio: { type: 'string', format: 'date-time' },
            data_fim: { type: 'string', format: 'date-time' },
            created_by: { type: 'string', format: 'uuid' },
            concurso_id: { type: 'string', format: 'uuid' },
            categoria_id: { type: 'string', format: 'uuid' },
            disciplinas: { type: 'object' },
            criado_em: { type: 'string', format: 'date-time' },
            atualizado_em: { type: 'string', format: 'date-time' },
          },
          required: ['titulo'],
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
            ativo: { type: 'boolean', default: true },
            criado_em: { type: 'string', format: 'date-time' },
            atualizado_em: { type: 'string', format: 'date-time' },
          },
          required: ['front', 'back', 'disciplina', 'tema'],
        },
        PlanoEstudo: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            usuario_id: { type: 'string', format: 'uuid' },
            nome: { type: 'string', example: 'Plano de Estudos PF 2024' },
            descricao: { type: 'string' },
            ativo: { type: 'boolean', default: true },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            concurso_id: { type: 'string', format: 'uuid' },
            categoria_id: { type: 'string', format: 'uuid' },
            criado_em: { type: 'string', format: 'date-time' },
            atualizado_em: { type: 'string', format: 'date-time' },
          },
          required: ['usuario_id', 'nome', 'start_date', 'end_date'],
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Mensagem de erro' },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            details: { type: 'object' },
          },
          required: ['error'],
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operação realizada com sucesso' },
            data: { type: 'object' },
          },
          required: ['success'],
        },
      },
    },
    tags: [
      { nome: 'Autenticação', descricao: 'Endpoints de autenticação e autorização' },
      { nome: 'Usuários', descricao: 'Gerenciamento de usuários' },
      { nome: 'Concursos', descricao: 'Gerenciamento de concursos' },
      { nome: 'Preferências', descricao: 'Preferências de usuário por concurso' },
      { nome: 'Simulados', descricao: 'Gerenciamento de simulados' },
      { nome: 'Flashcards', descricao: 'Sistema de flashcards' },
      { nome: 'Planos de Estudo', descricao: 'Gerenciamento de planos de estudo' },
      { nome: 'Estatísticas', descricao: 'Estatísticas e relatórios' },
      { nome: 'Sistema', descricao: 'Endpoints do sistema' },
    ],
  },
  apis: [
    './src/api/**/*.ts',
    './src/api/**/*.js',
    './src/index.ts',
    './src/docs.ts',
  ],
};

export const specs = swaggerJsdoc(options); 



