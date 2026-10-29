const { body, param, query } = require('express-validator');

const text = (field, max, label = field) => body(field, `Informe ${label} com até ${max} caracteres.`)
  .isString().bail().trim().isLength({ min: 1, max });
const email = () => body('email', 'Informe um e-mail válido com até 254 caracteres.')
  .isString().bail().trim().isEmail().bail().isLength({ max: 254 }).normalizeEmail();
const password = (minimum = 8) => body('senha', `A senha deve ter pelo menos ${minimum} caracteres.`)
  .isString().bail().isLength({ min: minimum }).bail()
  .custom((value) => Buffer.byteLength(value, 'utf8') <= 72).withMessage('A senha não pode exceder 72 bytes em UTF-8.');
const id = () => param('id', 'Informe um identificador inteiro válido.').isInt({ min: 1, max: 4294967295 }).toInt();

module.exports = {
  cadastro: () => [text('nome', 120, 'um nome'), email(), password()],
  login: () => [email(), password(1)],
  id: id,
  filme: () => [
    text('titulo', 180, 'um título'),
    body('anoLancamento', 'Informe um ano entre 1888 e 2100.').optional({ values: 'null' }).isInt({ min: 1888, max: 2100 }).toInt(),
    text('genero', 80, 'um gênero').optional({ values: 'null' }),
  ],
  editarFilme: () => [
    text('titulo', 180, 'um título').optional(),
    body('anoLancamento', 'Informe um ano entre 1888 e 2100 ou null.').optional().custom((value) => value === null || (Number.isInteger(Number(value)) && Number(value) >= 1888 && Number(value) <= 2100)).toInt(),
    body('genero', 'Informe um gênero entre 1 e 80 caracteres ou null.').optional().custom((value) => value === null || (typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 80)).customSanitizer((value) => typeof value === 'string' ? value.trim() : value),
  ],
  nota: () => [body('nota', 'A nota deve ser um número inteiro entre 1 e 5.').isInt({ min: 1, max: 5 }).toInt()],
  listagemFilmes: () => [
    query('limite', 'O limite deve ser um inteiro entre 1 e 100.').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('deslocamento', 'O deslocamento deve ser um inteiro não negativo.').optional().isInt({ min: 0, max: 2147483647 }).toInt(),
  ],
};
