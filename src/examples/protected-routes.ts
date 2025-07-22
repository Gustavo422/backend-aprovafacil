import express from 'express';
// Importações removidas - middleware não existe mais
// import { 
//   requireAuthWithToken, 
//   requireAdminWithToken, 
//   requirePermissions,
//   checkTokenExpiration
// } from '../middleware/token-validation';

// Create router
const router = express.Router();

// Create dependencies
// const userRepository = new UserRepository();
// const authService = new AuthService(userRepository);

// Exemplo de rota pública (apenas para referência)
// router.get('/public', (req, res) => {
//   res.json({ success: true, message: 'Rota pública funcionando' });
// });

// Todos os exemplos de rotas protegidas foram removidos pois dependiam de middlewares não existentes.

export default router;