const { Sequelize } = require('sequelize');

function connectDatabase(config, databaseName) {
  return new Sequelize(databaseName, config.user, config.password, {
    host: config.host,
    port: config.port,
    dialect: 'mysql',
    logging: false,
    define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
  });
}

module.exports = connectDatabase;
