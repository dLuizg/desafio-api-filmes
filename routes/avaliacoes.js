const { Router } = require('express');
const rules = require('../helpers/validators');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

module.exports = function avaliacaoRoutes({ Film, Rating, jwtConfig }) {
  const router = Router();
  const auth = authenticate(jwtConfig);
  router.use(auth, requireRole('cliente'));

  async function save(req, res, status) {
    const { id, nota } = req.input;
    if (!(await Film.findByPk(id))) return res.status(404).json({ mensagem: 'Filme não encontrado.' });
    const [rating, created] = await Rating.findOrCreate({
      where: { filmId: id, userId: req.user.id },
      defaults: { filmId: id, userId: req.user.id, score: nota },
    });
    if (!created) {
      if (status === 201) return res.status(409).json({ mensagem: 'Você já avaliou este filme. Use PUT para atualizar sua nota.' });
      await rating.update({ score: nota });
    } else if (status === 200) {
      return res.status(404).json({ mensagem: 'Você ainda não avaliou este filme. Use POST para criar sua avaliação.' });
    }
    return res.status(status).json({ avaliacao: { filmeId: id, nota: rating.score } });
  }

  router.post('/:id/avaliacoes', rules.id(), rules.nota(), validate, (req, res) => save(req, res, 201));
  router.put('/:id/avaliacoes', rules.id(), rules.nota(), validate, (req, res) => save(req, res, 200));
  return router;
};
