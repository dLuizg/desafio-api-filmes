const express = require('express');
const cors = require('cors');
const usuarioRoutes = require('./routes/usuarios');
const filmeRoutes = require('./routes/filmes');
const avaliacaoRoutes = require('./routes/avaliacoes');

module.exports = function createApp({ models, jwtConfig, corsOrigin = false }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '16kb' }));
  app.get('/saude', (req, res) => res.json({ status: 'ok' }));
  app.use('/usuarios', usuarioRoutes(models.User, jwtConfig));
  app.use('/filmes', filmeRoutes({ ...models, jwtConfig }));
  app.use('/filmes', avaliacaoRoutes({ ...models, jwtConfig }));
  app.use((req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ mensagem: 'JSON inválido.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ mensagem: 'O corpo da requisição excede o tamanho permitido.' });
    if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensagem: 'Registro já existente.' });
    }
    console.error('Falha na requisição:', error.name || 'Erro');
    return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
  });
  return app;
};
