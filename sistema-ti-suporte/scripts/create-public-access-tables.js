require('dotenv').config();

const connectDatabase = require('../src/database/connection');

async function run() {
  const db = await connectDatabase();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  console.log('Tabela password_reset_tokens criada/verificada com sucesso.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Erro ao criar tabela de recuperação:', error);
  process.exit(1);
});
