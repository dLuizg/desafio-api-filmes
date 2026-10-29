const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rules = require('../helpers/validators');
const validate = require('../middleware/validate');

module.exports = function usuarioRoutes(User, jwtConfig) {
  const router = Router();
  router.post('/cadastro', rules.cadastro(), validate, async (req, res) => {
    const { nome, email, senha } = req.input;
    if (await User.findOne({ where: { email } })) return res.status(409).json({ mensagem: 'E-mail já cadastrado.' });
    const user = await User.create({ name: nome, email, passwordHash: await bcrypt.hash(senha, 12), role: 'cliente' });
    return res.status(201).json({ usuario: { id: user.id, nome: user.name, email: user.email, perfil: 'cliente' } });
  });

  router.post('/entrar', rules.login(), validate, async (req, res) => {
    const { email, senha } = req.input;
    const user = await User.scope('withPassword').findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(senha, user.passwordHash))) return res.status(401).json({ mensagem: 'E-mail ou senha inválidos.' });
    const token = jwt.sign({ role: user.role }, jwtConfig.secret, {
      subject: String(user.id), expiresIn: '1h', algorithm: 'HS256', issuer: jwtConfig.issuer, audience: jwtConfig.audience,
    });
    return res.json({ token, tipoToken: 'Bearer', expiraEm: 3600, usuario: { id: user.id, nome: user.name, email: user.email, perfil: user.role } });
  });
  return router;
};
