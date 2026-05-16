require('dotenv').config();

const initDatabase = require('../src/database/init');

async function run() {
  await initDatabase();
  console.log('Migrations executadas com sucesso.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Erro ao executar migrations:', error);
  process.exit(1);
});
