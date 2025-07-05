#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Caminhos importantes
const rootDir = path.resolve(__dirname, '../..');
const envExamplePath = path.join(rootDir, '.env.production.example');
const envPath = path.join(rootDir, '.env.production');
const gitignorePath = path.join(rootDir, '.gitignore');

// Interface para leitura de entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para fazer perguntas ao usuário
const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
};

// Função para validar URL
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

// Função principal
const main = async () => {
  console.log(`\n${colors.bright}${colors.cyan}🛠️  Configuração do Ambiente de Produção${colors.reset}\n`);
  
  try {
    // Verifica se o arquivo .env.production já existe
    if (fs.existsSync(envPath)) {
      const overwrite = await question(
        `${colors.yellow}⚠️  O arquivo .env.production já existe. Deseja sobrescrever? (s/n) ${colors.reset}`
      );
      
      if (overwrite.toLowerCase() !== 's') {
        console.log('\nOperação cancelada pelo usuário.');
        process.exit(0);
      }
    }

    // Lê o arquivo de exemplo
    if (!fs.existsSync(envExamplePath)) {
      throw new Error('Arquivo .env.production.example não encontrado!');
    }
    
    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Obtém as variáveis do usuário
    console.log(`\n${colors.bright}🔧 Configuração do Ambiente de Produção${colors.reset}`);
    console.log(`${colors.yellow}Deixe em branco para usar os valores padrão.${colors.reset}\n`);
    
    // Configurações do Sentry
    const sentryDsn = await question(`🔑 Sentry DSN [${colors.yellow}deixe em branco para desativar${colors.reset}]: `);
    const sentryAuthToken = await question(`🔑 Sentry Auth Token [${colors.yellow}opcional${colors.reset}]: `);
    const sentryOrg = await question(`🏢 Sentry Organization [${colors.yellow}opcional${colors.reset}]: `);
    const sentryProject = await question(`📁 Sentry Project [${colors.yellow}opcional${colors.reset}]: `);
    
    // Configurações do site
    let siteUrl = '';
    while (!siteUrl) {
      siteUrl = await question('🌐 URL do site (ex: https://seu-site.com): ');
      if (siteUrl && !isValidUrl(siteUrl)) {
        console.log(`${colors.red}❌ URL inválida. Certifique-se de incluir o protocolo (http:// ou https://)${colors.reset}`);
        siteUrl = '';
      }
    }
    
    // Atualiza as variáveis no conteúdo
    envContent = envContent
      .replace('your_sentry_dsn_here', sentryDsn || '')
      .replace('your_sentry_auth_token_here', sentryAuthToken || '')
      .replace('your-sentry-org', sentryOrg || '')
      .replace('your-sentry-project', sentryProject || '')
      .replace('https://seu-site.com', siteUrl);
    
    // Salva o arquivo .env.production
    fs.writeFileSync(envPath, envContent);
    
    // Atualiza o .gitignore se necessário
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      if (!gitignore.includes('.env.production')) {
        fs.appendFileSync(gitignore, '\n# Arquivos de ambiente de produção\n.env.production\n');
      }
    }
    
    console.log(`\n${colors.green}✅ Configuração concluída com sucesso!${colors.reset}`);
    console.log(`Arquivo ${colors.cyan}.env.production${colors.reset} criado com sucesso.`);
    
    // Se o Sentry DSN foi fornecido, tenta configurar o release
    if (sentryDsn) {
      console.log('\nConfigurando release do Sentry...');
      try {
        const release = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        console.log(`Release configurado: ${colors.cyan}${release}${colors.reset}`);
      } catch (e) {
        console.warn(`${colors.yellow}⚠️  Não foi possível configurar o release do Sentry automaticamente.${colors.reset}`);
      }
    }
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Erro durante a configuração:${colors.reset}`, error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Executa o script
main();
