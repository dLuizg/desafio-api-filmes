# API de Avaliação de Filmes

API REST em Node.js e Express organizada em módulos de autenticação, catálogo de filmes e avaliações. Sequelize conecta o catálogo e as avaliações a dois bancos MySQL lógicos separados.

## Requisitos e configuração

- Node.js 22 ou superior e MySQL 8.
- Copie `.env.example` para `.env` e preencha o usuário/senha da aplicação e um `JWT_SECRET` aleatório com pelo menos 32 bytes. Se esse usuário não puder criar bancos, preencha também `DB_SETUP_USER` e `DB_SETUP_PASSWORD` com uma conta MySQL privilegiada local; ela só será usada para criar os bancos e conceder acesso ao usuário da API nesses dois bancos.
- Inicie o MySQL e execute `npm install`.
- Execute `npm run db:setup` para criar os bancos configurados e suas tabelas.
- Preencha `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` e execute `npm run admin:create`.
- Execute `npm start`. A API ficará disponível em `http://localhost:3030`.

O banco de filmes usa `DB_FILMES_NAME`; usuários e avaliações usam `DB_NOTAS_NAME`. Sem `DB_SETUP_USER`, o usuário MySQL da aplicação precisa de permissão para criar bancos e tabelas. Com essa conta opcional, o setup a usa apenas para criar os bancos e conceder acesso ao usuário da API. O comando cria somente bancos e tabelas ausentes, sem remover dados.

## Rotas

Todas as entradas e mensagens visíveis da API usam português. O token JWT expira após uma hora.

| Método | Rota | Acesso | Função |
| --- | --- | --- | --- |
| GET | `/saude` | Público | Verificar se a API está ativa |
| POST | `/usuarios/cadastro` | Público | Cadastrar cliente com `nome`, `email` e `senha` |
| POST | `/usuarios/entrar` | Público | Autenticar e receber token |
| GET | `/filmes` | Público | Listar filmes; aceita `limite` e `deslocamento` |
| GET | `/filmes/:id` | Público | Consultar filme |
| POST | `/filmes` | Administrador | Criar filme com `titulo`, `anoLancamento` e `genero` |
| PUT | `/filmes/:id` | Administrador | Atualizar um ou mais campos do filme |
| DELETE | `/filmes/:id` | Administrador | Excluir filme sem avaliações |
| POST | `/filmes/:id/avaliacoes` | Cliente autenticado | Registrar uma nota de 1 a 5 |
| PUT | `/filmes/:id/avaliacoes` | Cliente autenticado | Atualizar a própria nota |

Exemplo de cadastro:

```json
{"nome":"Ana Silva","email":"ana@example.com","senha":"SenhaSegura123!"}
```

Exemplo de criação de filme:

```json
{"titulo":"O Auto da Compadecida","anoLancamento":2000,"genero":"Comédia"}
```

Exemplo de avaliação:

```json
{"nota":5}
```

Clientes não podem definir o próprio perfil. O bootstrap do administrador usa os dados do `.env` e aceita senha entre 4 e 72 bytes; use uma senha forte fora de uma demonstração local. O cadastro público de clientes ainda exige pelo menos 8 caracteres. Um cliente só pode manter uma avaliação por filme; `POST` duplicado retorna conflito e `PUT` atualiza a nota. Um filme com avaliações não pode ser excluído para preservar a integridade do histórico.

## Insomnia

Importe `insomnia/collection.json` no projeto **My first project**. A coleção possui o ambiente `Local` com `base_url`, `filme_id`, `token_cliente` e `token_admin`. Após executar cada login, copie o campo `token` da resposta para a variável correspondente em **Manage Environments**. Execute os requests de criação/login antes dos requests protegidos.

## Verificação

```powershell
npm test
```

Os testes exercitam as rotas HTTP, validação, papéis, JWT e persistência simulada. Para conferir a persistência real entre os dois bancos, execute o fluxo da coleção Insomnia com MySQL ativo.
