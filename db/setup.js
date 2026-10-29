const mysql = require('mysql2/promise');
const readConfig = require('../config');
const connectDatabase = require('./conn');
const { defineUserModel, defineFilmModel, defineRatingModel } = require('./models');

async function setup() {
  const config = readConfig();
  for (const name of [config.database.filmes, config.database.notas]) {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error('Os nomes dos bancos podem conter apenas letras, números e sublinhados.');
  }
  const connection = await mysql.createConnection({
    host: config.database.host,
    port: config.database.port,
    user: config.database.setupUser || config.database.user,
    password: config.database.setupUser ? config.database.setupPassword : config.database.password,
  });
  try {
    if (config.database.setupUser) {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.filmes}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.notas}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      const appConnection = await mysql.createConnection({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
      });
      try {
        const [[account]] = await appConnection.query('SELECT CURRENT_USER() AS account');
        const [user, host] = account.account.split('@');
        if (!/^[a-zA-Z0-9_]+$/.test(user) || !/^[a-zA-Z0-9_.:%-]+$/.test(host)) {
          throw new Error('Não foi possível determinar a conta MySQL da aplicação para conceder acesso.');
        }
        for (const name of [config.database.filmes, config.database.notas]) {
          await connection.query(`GRANT ALL PRIVILEGES ON \`${name}\`.* TO '${user}'@'${host}'`);
        }
      } finally {
        await appConnection.end();
      }
    } else {
      try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.filmes}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.notas}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      } catch (error) {
        if (error.code !== 'ER_DBACCESS_DENIED_ERROR' && error.code !== 'ER_ACCESS_DENIED_ERROR') throw error;
        const names = [config.database.filmes, config.database.notas];
        const [schemas] = await connection.query(
          'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME IN (?, ?)', names,
        );
        if (schemas.length !== names.length) {
          throw new Error('Os bancos ainda não existem. Defina DB_SETUP_USER/DB_SETUP_PASSWORD ou peça a um administrador para criá-los.');
        }
      }
    }
  } finally {
    await connection.end();
  }

  const filmesDb = connectDatabase(config.database, config.database.filmes);
  const notasDb = connectDatabase(config.database, config.database.notas);
  try {
    defineFilmModel(filmesDb);
    defineUserModel(notasDb);
    defineRatingModel(notasDb);
    await Promise.all([filmesDb.authenticate(), notasDb.authenticate()]);
    await Promise.all([filmesDb.sync(), notasDb.sync()]);
    console.log('Os bancos e as tabelas estão prontos.');
  } finally {
    await Promise.all([filmesDb.close(), notasDb.close()]);
  }
}

setup().catch((error) => {
  console.error('Falha na configuração dos bancos:', error.message);
  process.exitCode = 1;
});
