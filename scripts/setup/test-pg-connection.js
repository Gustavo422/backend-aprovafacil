import pg from 'pg';

// Configuração da conexão com o banco de dados
const pool = new pg.Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'postgres',
  password: 'postgres',
  port: 54322, // Porta padrão do Supabase para PostgreSQL
});

// Função para testar a conexão
async function testConnection() {
  console.log('Testando conexão com o banco de dados...');
  
  try {
    // Testar conexão
    const client = await pool.connect();
    console.log('✅ Conexão bem-sucedida!');
    
    // Listar bancos de dados
    console.log('\nListando bancos de dados:');
    const dbResult = await client.query('SELECT datname FROM pg_database;');
    console.log(dbResult.rows);
    
    // Listar tabelas no banco de dados atual
    console.log('\nListando tabelas no esquema público:');
    const tableResult = await client.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name;`
    );
    
    if (tableResult.rows.length === 0) {
      console.log('Nenhuma tabela encontrada no esquema público.');
    } else {
      console.log('Tabelas encontradas:');
      tableResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }
    
    // Liberar o cliente
    client.release();
    
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err);
  } finally {
    // Encerrar o pool de conexões
    await pool.end();
  }
}

// Executar o teste
testConnection();
