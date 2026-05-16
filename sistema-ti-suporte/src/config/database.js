const path = require('path');

module.exports = {
  filename: process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'database.sqlite')
};
