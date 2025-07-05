# AprovaFacil API - Documentação

## Visão Geral

A API do AprovaFacil é uma REST API desenvolvida em TypeScript/Node.js para gerenciar um sistema de estudos e preparação para concursos. A API segue os princípios SOLID e utiliza validação com Zod.

## Base URL

- **Desenvolvimento**: `http://localhost:3000/api`
- **Produção**: `https://api.aprovafacil.com`

## Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação. Para endpoints protegidos, inclua o token no header:

```
Authorization: Bearer <seu-token-jwt>
```

## Endpoints

### Autenticação

#### POST /auth/login
Realiza login do usuário.

**Request Body:**
```json
{
  "email": "usuario@exemplo.com",
  "senha": "senha123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "usuario@exemplo.com",
    "nome": "João Silva"
  },
  "message": "Login realizado com sucesso"
}
```

#### POST /auth/register
Registra um novo usuário.

**Request Body:**
```json
{
  "email": "novo@exemplo.com",
  "senha": "senha123",
  "nome": "Maria Silva"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "user": {
    "id": "user-456",
    "email": "novo@exemplo.com",
    "nome": "Maria Silva"
  }
}
```

### Apostilas

#### GET /apostilas
Lista todas as apostilas disponíveis.

**Query Parameters:**
- `id` (opcional): ID da apostila específica
- `categoria` (opcional): Filtrar por categoria

**Response (200):**
```json
{
  "success": true,
  "apostilas": [
    {
      "id": "apostila-123",
      "titulo": "Direito Constitucional",
      "categoria": "Direito",
      "descricao": "Apostila completa sobre Direito Constitucional"
    }
  ]
}
```

#### POST /apostilas
Cria uma nova apostila.

**Request Body:**
```json
{
  "titulo": "Direito Administrativo",
  "categoria": "Direito",
  "descricao": "Apostila sobre Direito Administrativo"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Apostila criada com sucesso",
  "apostila": {
    "id": "apostila-456",
    "titulo": "Direito Administrativo",
    "categoria": "Direito"
  }
}
```

### Flashcards

#### GET /flashcards
Lista todos os flashcards.

**Query Parameters:**
- `disciplina` (opcional): Filtrar por disciplina
- `tema` (opcional): Filtrar por tema

**Response (200):**
```json
{
  "success": true,
  "flashcards": [
    {
      "id": "flashcard-123",
      "front": "O que é Direito Constitucional?",
      "back": "Ramo do direito que estuda a constituição",
      "disciplina": "Direito",
      "tema": "Constitucional"
    }
  ]
}
```

#### POST /flashcards
Cria um novo flashcard.

**Request Body:**
```json
{
  "front": "Qual é a capital do Brasil?",
  "back": "Brasília",
  "disciplina": "Geografia",
  "tema": "Capitais",
  "subtema": "Brasil"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Flashcard criado com sucesso",
  "flashcard": {
    "id": "flashcard-456",
    "front": "Qual é a capital do Brasil?",
    "back": "Brasília"
  }
}
```

## Códigos de Erro

### 400 - Bad Request
Dados inválidos ou faltando.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": [
      {
        "field": "email",
        "message": "Email é obrigatório"
      }
    ]
  }
}
```

### 401 - Unauthorized
Credenciais inválidas ou token expirado.

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email ou senha incorretos"
  }
}
```

### 404 - Not Found
Recurso não encontrado.

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Apostila não encontrada"
  }
}
```

### 500 - Internal Server Error
Erro interno do servidor.

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Erro interno do servidor. Tente novamente."
  }
}
```

## Validação

A API utiliza Zod para validação de dados. Todos os endpoints validam:

- **Tipos de dados**: Verificação de tipos corretos
- **Campos obrigatórios**: Validação de campos requeridos
- **Formato de email**: Validação de formato de email válido
- **Tamanho mínimo**: Validação de tamanhos mínimos
- **Sanitização**: Limpeza de dados de entrada

## Rate Limiting

Para endpoints de autenticação:
- **Login**: Máximo 5 tentativas em 15 minutos por IP
- **Registro**: Máximo 3 tentativas em 1 hora por IP

## Exemplos de Uso

### JavaScript/Node.js

```javascript
// Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'usuario@exemplo.com',
    senha: 'senha123'
  })
});

const loginData = await loginResponse.json();
const token = loginData.token;

// Buscar apostilas
const apostilasResponse = await fetch('http://localhost:3000/api/apostilas', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const apostilas = await apostilasResponse.json();
```

### Python

```python
import requests

# Login
login_data = {
    'email': 'usuario@exemplo.com',
    'senha': 'senha123'
}

response = requests.post('http://localhost:3000/api/auth/login', json=login_data)
login_result = response.json()
token = login_result['token']

# Buscar apostilas
headers = {'Authorization': f'Bearer {token}'}
apostilas_response = requests.get('http://localhost:3000/api/apostilas', headers=headers)
apostilas = apostilas_response.json()
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@exemplo.com", "senha": "senha123"}'

# Buscar apostilas (com token)
curl -X GET http://localhost:3000/api/apostilas \
  -H "Authorization: Bearer <seu-token>"
```

## Documentação Interativa

Acesse a documentação interativa da API em:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **OpenAPI JSON**: `http://localhost:3000/api/docs/openapi.json`

## Desenvolvimento

### Instalação

```bash
npm install
```

### Executar em desenvolvimento

```bash
npm run dev
```

### Executar testes

```bash
npm test
```

### Verificar lint

```bash
npm run lint
```

### Build para produção

```bash
npm run build
```

## Estrutura do Projeto

```
src/
├── api/                    # Endpoints da API
│   ├── auth/              # Autenticação
│   ├── apostilas/         # Apostilas
│   ├── flashcards/        # Flashcards
│   └── docs/              # Documentação
├── core/                  # Lógica central
│   ├── validation/        # Validação Zod
│   ├── errors/           # Tratamento de erros
│   └── documentation/    # Documentação OpenAPI
├── features/             # Funcionalidades
│   ├── auth/             # Autenticação
│   ├── apostilas/        # Apostilas
│   └── flashcards/       # Flashcards
└── types/                # Tipos TypeScript
```

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes. 