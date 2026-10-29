const { DataTypes } = require('sequelize');

function defineUserModel(sequelize) {
  return sequelize.define('User', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(60), allowNull: false },
    role: { type: DataTypes.ENUM('cliente', 'administrador'), allowNull: false, defaultValue: 'cliente' },
  }, {
    tableName: 'usuarios',
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: ['id', 'name', 'email', 'passwordHash', 'role'] } },
  });
}

function defineFilmModel(sequelize) {
  return sequelize.define('Film', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    year: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    genre: { type: DataTypes.STRING(80), allowNull: true },
  }, { tableName: 'filmes' });
}

function defineRatingModel(sequelize) {
  return sequelize.define('Rating', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    filmId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    score: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, validate: { min: 1, max: 5 } },
  }, {
    tableName: 'notas',
    indexes: [{ unique: true, fields: ['userId', 'filmId'] }, { fields: ['filmId'] }],
  });
}

module.exports = { defineUserModel, defineFilmModel, defineRatingModel };
