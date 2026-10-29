const bcrypt = require('bcrypt');
const readConfig = require('../config');
const connectDatabase = require('../db/conn');
const { defineUserModel } = require('../db/models');

async function createAdmin() {
  const config = readConfig();
  const { ADMIN_NAME: name, ADMIN_EMAIL: rawEmail, ADMIN_PASSWORD: password } = process.env;
  if (!name || !rawEmail || !password) throw new Error('Defina ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD no arquivo .env.');
  if (Buffer.byteLength(password, 'utf8') > 72 || password.length < 4) throw new Error('A senha de administrador deve ter entre 4 caracteres e 72 bytes.');
  const sequelize = connectDatabase(config.database, config.database.notas);
  try {
    const User = defineUserModel(sequelize);
    await sequelize.authenticate();
    const email = rawEmail.trim().toLowerCase();
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      if (existing.role !== 'administrador') await existing.update({ role: 'administrador' });
      console.log('A conta informada já existe e agora tem perfil de administrador.');
      return;
    }
    await User.create({ name: name.trim(), email, passwordHash: await bcrypt.hash(password, 12), role: 'administrador' });
    console.log('Conta de administrador criada.');
  } finally {
    await sequelize.close();
  }
}

createAdmin().catch((error) => {
  console.error('Falha ao criar administrador:', error.message);
  process.exitCode = 1;
});
