require('dotenv').config();

const fs = require('fs');
const path = require('path');
const connectDatabase = require('./connection');

async function initDatabase() {
  const db = await connectDatabase();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  await db.exec(schema);

  return db;
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Banco de dados inicializado com sucesso.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao inicializar banco de dados:', error);
      process.exit(1);
    });
}

module.exports = initDatabase;
