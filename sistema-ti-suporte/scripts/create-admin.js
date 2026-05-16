require('dotenv').config();

const bcrypt = require('bcryptjs');
const initDatabase = require('../src/database/init');
const UserModel = require('../src/models/UserModel');

async function createAdmin() {
  await initDatabase();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@techfix.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminName = process.env.ADMIN_NAME || 'Administrador TECHFIX';

  const existingUser = await UserModel.findByEmail(adminEmail);

  if (existingUser) {
    console.log('Usuário administrador já existe.');
    console.log(`E-mail: ${adminEmail}`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await UserModel.create({
    name: adminName,
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    status: 'active'
  });

  console.log('Usuário administrador criado com sucesso.');
  console.log(`E-mail: ${adminEmail}`);
  console.log(`Senha: ${adminPassword}`);
  process.exit(0);
}

createAdmin().catch((error) => {
  console.error('Erro ao criar administrador:', error);
  process.exit(1);
});
