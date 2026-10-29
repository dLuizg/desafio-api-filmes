const { Router } = require('express');
const rules = require('../helpers/validators');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const serialize = (film) => ({
  id: film.id,
  titulo: film.title,
  anoLancamento: film.year,
  genero: film.genre,
});

module.exports = function filmeRoutes({ Film, Rating, jwtConfig }) {
  const router = Router();
  const auth = authenticate(jwtConfig);

  router.get('/', rules.listagemFilmes(), validate, async (req, res) => {
    const { limite = 50, deslocamento = 0 } = req.input;
    const result = await Film.findAndCountAll({ limit: limite, offset: deslocamento, order: [['title', 'ASC'], ['id', 'ASC']] });
    return res.json({ filmes: result.rows.map(serialize), total: result.count, limite, deslocamento });
  });

  router.get('/:id', rules.id(), validate, async (req, res) => {
    const film = await Film.findByPk(req.input.id);
    if (!film) return res.status(404).json({ mensagem: 'Filme não encontrado.' });
    return res.json({ filme: serialize(film) });
  });

  router.post('/', auth, requireRole('administrador'), rules.filme(), validate, async (req, res) => {
    const { titulo, anoLancamento = null, genero = null } = req.input;
    const film = await Film.create({ title: titulo, year: anoLancamento, genre: genero });
    return res.status(201).json({ filme: serialize(film) });
  });

  router.put('/:id', auth, requireRole('administrador'), rules.id(), rules.editarFilme(), validate, async (req, res) => {
    const film = await Film.findByPk(req.input.id);
    if (!film) return res.status(404).json({ mensagem: 'Filme não encontrado.' });
    const values = {};
    if (req.input.titulo !== undefined) values.title = req.input.titulo;
    if (req.input.anoLancamento !== undefined) values.year = req.input.anoLancamento;
    if (req.input.genero !== undefined) values.genre = req.input.genero;
    if (!Object.keys(values).length) return res.status(422).json({ mensagem: 'Informe ao menos um campo para alteração.' });
    await film.update(values);
    return res.json({ filme: serialize(film) });
  });

  router.delete('/:id', auth, requireRole('administrador'), rules.id(), validate, async (req, res) => {
    const film = await Film.findByPk(req.input.id);
    if (!film) return res.status(404).json({ mensagem: 'Filme não encontrado.' });
    if (await Rating.count({ where: { filmId: film.id } })) {
      return res.status(409).json({ mensagem: 'O filme possui avaliações e não pode ser excluído.' });
    }
    await film.destroy();
    return res.status(204).end();
  });

  return router;
};
