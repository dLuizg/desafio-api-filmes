require('dotenv').config({ quiet: true });

function readConfig() {
  for (const key of ['DB_HOST', 'DB_USER', 'DB_FILMES_NAME', 'DB_NOTAS_NAME', 'JWT_SECRET']) {
    if (!process.env[key]) throw new Error(`Variável de ambiente não informada: ${key}`);
  }
  if (Buffer.byteLength(process.env.JWT_SECRET) < 32) {
    throw new Error('JWT_SECRET deve conter pelo menos 32 bytes.');
  }
  const portValue = Number(process.env.PORT || 3030);
  const dbPortValue = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(portValue) || portValue < 1 || portValue > 65535) throw new Error('PORT inválida.');
  if (!Number.isInteger(dbPortValue) || dbPortValue < 1 || dbPortValue > 65535) throw new Error('DB_PORT inválida.');
  return {
    port: portValue,
    jwtSecret: process.env.JWT_SECRET,
    jwtIssuer: process.env.JWT_ISSUER || 'api-avaliacao-filmes',
    jwtAudience: process.env.JWT_AUDIENCE || 'api-avaliacao-filmes-clientes',
    corsOrigin: process.env.CORS_ORIGIN || false,
    database: {
      host: process.env.DB_HOST,
      port: dbPortValue,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      filmes: process.env.DB_FILMES_NAME,
      notas: process.env.DB_NOTAS_NAME,
      setupUser: process.env.DB_SETUP_USER || '',
      setupPassword: process.env.DB_SETUP_PASSWORD || '',
    },
  };
}

module.exports = readConfig;
