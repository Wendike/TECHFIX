require('dotenv').config();

const connectDatabase = require('../src/database/connection');

async function run() {
  const db = await connectDatabase();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      user_role TEXT,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      status_code INTEGER,
      ip TEXT,
      user_agent TEXT,
      duration_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Tabela audit_logs criada/verificada com sucesso.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Erro ao criar tabelas administrativas:', error);
  process.exit(1);
});
