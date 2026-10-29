const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const bcrypt = require('bcrypt');
const createApp = require('../app');

const jwtConfig = { secret: 'segredo-de-teste-com-mais-de-trinta-e-dois-bytes', issuer: 'teste-api', audience: 'teste-clientes' };
const users = [];
const films = [];
const ratings = [];
const matches = (row, where) => Object.entries(where).every(([key, value]) => row[key] === value);

const models = {
  User: {
    scope() { return this; },
    async findOne({ where }) { return users.find((row) => matches(row, where)) || null; },
    async create(values) { const row = { id: users.length + 1, ...values }; users.push(row); return row; },
  },
  Film: {
    async findByPk(id) { return films.find((row) => row.id === Number(id)) || null; },
    async findAndCountAll({ limit, offset }) {
      const ordered = [...films].sort((a, b) => a.title.localeCompare(b.title));
      return { rows: ordered.slice(offset, offset + limit), count: ordered.length };
    },
    async create(values) {
      if (films.some((row) => row.title === values.title)) {
        const error = new Error('Duplicado'); error.name = 'SequelizeUniqueConstraintError'; throw error;
      }
      const row = { id: films.length + 1, ...values, async update(next) { Object.assign(this, next); }, async destroy() { films.splice(films.indexOf(this), 1); } };
      films.push(row); return row;
    },
  },
  Rating: {
    async count({ where }) { return ratings.filter((row) => matches(row, where)).length; },
    async findOrCreate({ where, defaults }) {
      const existing = ratings.find((row) => matches(row, where));
      if (existing) return [existing, false];
      const row = { id: ratings.length + 1, ...defaults, async update(values) { Object.assign(this, values); } };
      ratings.push(row); return [row, true];
    },
  },
};

let server;
let baseUrl;
let customerToken;
let adminToken;
let filmId;

before(async () => {
  users.push({ id: 1, name: 'Administrador', email: 'admin@example.com', passwordHash: await bcrypt.hash('SenhaAdmin123!', 4), role: 'administrador' });
  server = createApp({ models, jwtConfig }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

async function request(method, path, body, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}

test('fluxos de autenticação, filmes, autorização e avaliações', async () => {
  assert.deepEqual((await request('GET', '/saude')).body, { status: 'ok' });

  const registration = await request('POST', '/usuarios/cadastro', {
    nome: ' Ana Silva ', email: 'ANA@example.com', senha: 'SenhaCliente123!', perfil: 'administrador',
  });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.usuario.perfil, 'cliente');
  assert.equal(users[1].role, 'cliente');
  assert.equal(await bcrypt.compare('SenhaCliente123!', users[1].passwordHash), true);
  assert.equal((await request('POST', '/usuarios/cadastro', {
    nome: 'Ana Silva', email: 'ana@example.com', senha: 'SenhaCliente123!',
  })).status, 409);

  customerToken = (await request('POST', '/usuarios/entrar', { email: 'ana@example.com', senha: 'SenhaCliente123!' })).body.token;
  adminToken = (await request('POST', '/usuarios/entrar', { email: 'admin@example.com', senha: 'SenhaAdmin123!' })).body.token;
  assert.ok(customerToken);
  assert.ok(adminToken);

  assert.equal((await request('GET', '/filmes')).status, 200);
  assert.equal((await request('POST', '/filmes', { titulo: 'Filme A', anoLancamento: 2020, genero: 'Drama' }, customerToken)).status, 403);
  const created = await request('POST', '/filmes', { titulo: 'Filme A', anoLancamento: 2020, genero: 'Drama' }, adminToken);
  assert.equal(created.status, 201);
  filmId = created.body.filme.id;
  assert.equal((await request('GET', `/filmes/${filmId}`)).body.filme.titulo, 'Filme A');
  assert.equal((await request('POST', '/filmes', { titulo: 'Filme B' })).status, 401);
  assert.equal((await request('PUT', `/filmes/${filmId}`, { genero: 'Terror' }, 'token-invalido')).status, 401);
  assert.equal((await request('PUT', `/filmes/${filmId}`, { genero: 'Comédia' }, adminToken)).body.filme.genero, 'Comédia');

  assert.equal((await request('POST', `/filmes/${filmId}/avaliacoes`, { nota: 6 }, customerToken)).status, 422);
  assert.equal((await request('POST', `/filmes/${filmId}/avaliacoes`, { nota: 5 })).status, 401);
  assert.equal((await request('POST', `/filmes/${filmId}/avaliacoes`, { nota: 5 }, customerToken)).status, 201);
  assert.equal((await request('POST', `/filmes/${filmId}/avaliacoes`, { nota: 5 }, adminToken)).status, 403);
  assert.equal((await request('POST', `/filmes/${filmId}/avaliacoes`, { nota: 4 }, customerToken)).status, 409);
  assert.equal((await request('PUT', `/filmes/${filmId}/avaliacoes`, { nota: 3 }, customerToken)).body.avaliacao.nota, 3);
  const guardedDelete = await request('DELETE', `/filmes/${filmId}`, undefined, adminToken);
  assert.equal(guardedDelete.status, 409, JSON.stringify(guardedDelete.body));
  assert.equal((await request('PUT', '/filmes/999/avaliacoes', { nota: 3 }, customerToken)).status, 404);
});

test('valida entradas inválidas e preserva recursos sem avaliações ao excluir', async () => {
  assert.equal((await request('POST', '/usuarios/cadastro', { nome: '', email: 'inválido', senha: '123' })).status, 422);
  const other = await request('POST', '/filmes', { titulo: 'Filme sem avaliação' }, adminToken);
  assert.equal(other.status, 201);
  const forbiddenDelete = await request('DELETE', `/filmes/${other.body.filme.id}`, undefined, customerToken);
  assert.equal(forbiddenDelete.status, 403, JSON.stringify(forbiddenDelete.body));
  assert.equal((await request('DELETE', `/filmes/${other.body.filme.id}`, undefined, adminToken)).status, 204);
  assert.equal((await request('GET', `/filmes/${other.body.filme.id}`)).status, 404);
});
