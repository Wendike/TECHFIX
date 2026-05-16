const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const databaseConfig = require('../config/database');

let database = null;

async function connectDatabase() {
  if (database) {
    return database;
  }

  database = await open({
    filename: databaseConfig.filename,
    driver: sqlite3.Database
  });

  await database.exec('PRAGMA foreign_keys = ON');

  return database;
}

module.exports = connectDatabase;
