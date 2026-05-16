require('dotenv').config();

const connectDatabase = require('../src/database/connection');

async function run() {
  const db = await connectDatabase();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS repair_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER NOT NULL,
      part_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
    );
  `);

  console.log('Tabela repair_parts criada/verificada com sucesso.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Erro ao criar tabela repair_parts:', error);
  process.exit(1);
});
