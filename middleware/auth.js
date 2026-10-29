const jwt = require('jsonwebtoken');

function authenticate({ secret, issuer, audience }) {
  return (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
    if (!match) return res.status(401).json({ mensagem: 'Informe um token de autenticação do tipo Bearer.' });
    try {
      const payload = jwt.verify(match[1], secret, { algorithms: ['HS256'], issuer, audience });
      if (!/^[1-9]\d*$/.test(payload.sub) || !['cliente', 'administrador'].includes(payload.role)) throw new Error('Token inválido.');
      req.user = { id: Number(payload.sub), role: payload.role };
    } catch {
      return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
    }
    return next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => req.user && roles.includes(req.user.role)
    ? next()
    : res.status(req.user ? 403 : 401).json({ mensagem: 'Você não tem permissão para esta operação.' });
}

module.exports = { authenticate, requireRole };
