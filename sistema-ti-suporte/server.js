require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('========================================');
  console.log(' Sistema TECHFIX iniciado com sucesso');
  console.log(` Servidor rodando na porta ${PORT}`);
  console.log(` Acesse: http://localhost:${PORT}`);
  console.log('========================================');
});
