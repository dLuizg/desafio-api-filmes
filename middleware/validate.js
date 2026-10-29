const { validationResult, matchedData } = require('express-validator');

module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ mensagem: 'Há dados inválidos na requisição.', erros: errors.array().map(({ msg, path }) => ({ campo: path, mensagem: msg })) });
  }
  req.input = matchedData(req, { locations: ['body', 'params', 'query'], includeOptionals: false });
  return next();
};
