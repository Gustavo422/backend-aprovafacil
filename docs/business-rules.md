# Regras de Negócio - AprovaFacil

## 1. Autenticação e Usuários

### 1.1 Registro de Usuário
- **Email único**: Cada email só pode ser usado para uma conta
- **Validação de senha**: Mínimo 6 caracteres
- **Nome obrigatório**: Campo nome é obrigatório e deve ter pelo menos 2 caracteres
- **Confirmação de email**: Após registro, usuário deve confirmar email (implementação futura)

### 1.2 Login
- **Rate limiting**: Máximo 5 tentativas de login em 15 minutos por IP
- **Bloqueio temporário**: Após exceder rate limit, usuário deve aguardar 15 minutos
- **Sessão**: Token JWT válido por 24 horas
- **Logout**: Token invalidadado no logout

### 1.3 Perfil do Usuário
- **Dados obrigatórios**: ID, email, nome
- **Dados opcionais**: Foto, bio, preferências de estudo
- **Estatísticas**: Total de questões respondidas, acertos, tempo de estudo

## 2. Apostilas

### 2.1 Criação de Apostilas
- **Título obrigatório**: Campo título é obrigatório
- **Categorização**: Apostilas devem ser categorizadas por disciplina/concurso
- **Conteúdo**: Apostilas podem ter conteúdo estruturado (capítulos, seções)
- **Visibilidade**: Apostilas podem ser públicas ou privadas

### 2.2 Acesso às Apostilas
- **Usuários autenticados**: Podem acessar apostilas públicas
- **Filtros**: Por categoria, concurso, disciplina
- **Busca**: Por título, conteúdo, tags
- **Progresso**: Rastreamento de leitura e conclusão

## 3. Flashcards

### 3.1 Criação de Flashcards
- **Campos obrigatórios**: Frente, verso, disciplina, tema
- **Campos opcionais**: Subtema, concurso relacionado
- **Validação**: Frente e verso não podem estar vazios
- **Limite**: Máximo 1000 flashcards por usuário

### 3.2 Sistema de Repetição Espaçada
- **Níveis de dificuldade**: Fácil, Médio, Difícil
- **Intervalos**: Baseados no algoritmo SM-2
- **Revisão**: Flashcards aparecem baseados no nível de dificuldade
- **Progresso**: Rastreamento de acertos/erros

### 3.3 Organização
- **Decks**: Flashcards podem ser organizados em decks
- **Tags**: Sistema de tags para categorização
- **Busca**: Por conteúdo, disciplina, tema
- **Compartilhamento**: Decks podem ser compartilhados (futuro)

## 4. Simulados

### 4.1 Criação de Simulados
- **Questões**: Mínimo 10 questões por simulado
- **Tempo limite**: Configurável por simulado
- **Categorização**: Por concurso, disciplina, nível
- **Validação**: Questões devem ter alternativas válidas

### 4.2 Execução de Simulados
- **Tempo**: Controle de tempo por questão e total
- **Pausa**: Simulado pode ser pausado e retomado
- **Revisão**: Usuário pode revisar questões antes de finalizar
- **Resultado**: Pontuação e análise de desempenho

### 4.3 Análise de Resultados
- **Pontuação**: Cálculo baseado em acertos
- **Ranking**: Comparação com outros usuários
- **Análise por disciplina**: Desempenho por área
- **Recomendações**: Sugestões de estudo baseadas no desempenho

## 5. Plano de Estudos

### 5.1 Criação de Planos
- **Objetivo**: Meta específica (concurso, data)
- **Disciplinas**: Seleção de disciplinas a estudar
- **Tempo**: Distribuição de tempo por disciplina
- **Priorização**: Baseada em pontos fracos do usuário

### 5.2 Execução do Plano
- **Cronograma**: Distribuição diária/semanal de atividades
- **Flexibilidade**: Ajustes baseados no progresso
- **Lembretes**: Notificações de atividades pendentes
- **Acompanhamento**: Progresso vs. meta

### 5.3 Otimização
- **Análise de performance**: Identificação de pontos fracos
- **Ajustes automáticos**: Rebalanceamento baseado em resultados
- **Recomendações**: Sugestões de foco de estudo

## 6. Estatísticas e Analytics

### 6.1 Coleta de Dados
- **Tempo de estudo**: Rastreamento de sessões
- **Performance**: Acertos/erros em questões
- **Engajamento**: Frequência de uso
- **Progresso**: Evolução ao longo do tempo

### 6.2 Relatórios
- **Dashboard**: Visão geral do progresso
- **Relatórios semanais**: Resumo de atividades
- **Comparação**: Performance vs. média
- **Projeções**: Estimativas de conclusão

### 6.3 Insights
- **Pontos fortes/fracos**: Identificação automática
- **Recomendações**: Sugestões personalizadas
- **Alertas**: Notificações de queda de performance

## 7. Segurança e Privacidade

### 7.1 Proteção de Dados
- **Criptografia**: Senhas hasheadas com bcrypt
- **HTTPS**: Todas as comunicações criptografadas
- **Tokens**: JWT com expiração
- **Rate limiting**: Proteção contra ataques

### 7.2 Privacidade
- **Dados pessoais**: Mínimo necessário coletado
- **Consentimento**: Usuário deve consentir com coleta
- **Exclusão**: Direito de deletar conta e dados
- **Anonimização**: Dados agregados para analytics

## 8. Performance e Escalabilidade

### 8.1 Otimizações
- **Cache**: Cache de dados frequentemente acessados
- **Paginação**: Listas grandes paginadas
- **Lazy loading**: Carregamento sob demanda
- **CDN**: Distribuição de conteúdo estático

### 8.2 Monitoramento
- **Métricas**: Tempo de resposta, taxa de erro
- **Alertas**: Notificações de problemas
- **Logs**: Rastreamento de operações
- **Backup**: Backup regular dos dados

## 9. Integrações Futuras

### 9.1 Funcionalidades Planejadas
- **Chat com IA**: Assistente de estudos
- **Gamificação**: Sistema de pontos e conquistas
- **Comunidade**: Fóruns e grupos de estudo
- **Mobile**: Aplicativo nativo

### 9.2 APIs Externas
- **Calendário**: Integração com Google Calendar
- **Notificações**: Push notifications
- **Compartilhamento**: Redes sociais
- **Pagamentos**: Sistema de assinatura premium 