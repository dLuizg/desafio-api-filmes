const readConfig = require('./config');
const connectDatabase = require('./db/conn');
const { defineUserModel, defineFilmModel, defineRatingModel } = require('./db/models');
const createApp = require('./app');

async function start() {
  const config = readConfig();
  const filmesDb = connectDatabase(config.database, config.database.filmes);
  const notasDb = connectDatabase(config.database, config.database.notas);
  try {
    const models = {
      Film: defineFilmModel(filmesDb),
      User: defineUserModel(notasDb),
      Rating: defineRatingModel(notasDb),
    };
    await Promise.all([filmesDb.authenticate(), notasDb.authenticate()]);
    const app = createApp({
      models,
      jwtConfig: { secret: config.jwtSecret, issuer: config.jwtIssuer, audience: config.jwtAudience },
      corsOrigin: config.corsOrigin,
    });
    const server = app.listen(config.port, () => console.log(`API em execução na porta ${config.port}.`));
    server.on('error', async (error) => {
      console.error(error.code === 'EADDRINUSE'
        ? `A porta ${config.port} já está em uso.`
        : `Falha no servidor HTTP: ${error.code || error.message}`);
      await Promise.all([filmesDb.close(), notasDb.close()]);
      process.exitCode = 1;
    });
    const shutdown = async () => {
      server.close(async () => {
        await Promise.all([filmesDb.close(), notasDb.close()]);
        process.exit(0);
      });
    };
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, shutdown);
  } catch (error) {
    await Promise.all([filmesDb.close(), notasDb.close()]);
    throw error;
  }
}

start().catch((error) => {
  console.error('Falha na inicialização:', error.message);
  process.exitCode = 1;
});
