import 'dotenv/config';
import AprovaFacilApp from './app.js';
import { validateEnvironment } from './config/environment.js';

// Validar variáveis de ambiente antes de iniciar
validateEnvironment();

const app = new AprovaFacilApp();
app.start();




