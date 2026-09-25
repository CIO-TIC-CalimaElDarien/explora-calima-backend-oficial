const jwt = require('jsonwebtoken');

// Este es el guardia que verifica el token
const verificarToken = (req, res, next) => {
  // 1. Buscamos el token en la cabecera 'Authorization'
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extraemos solo el token, quitando la palabra "Bearer"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No hay token de seguridad.' });
  }

  try {
    // 2. Verificamos que el token sea válido usando tu palabra secreta
    // (Asegúrate de que 'TU_SECRETO_AQUI' sea la misma variable de entorno que usaste en el Login)
    const verificado = jwt.verify(token, process.env.JWT_SECRET || 'calima_secreto_turismo_2026');
    
    // 3. Si es válido, guardamos los datos del usuario en la petición y lo dejamos pasar
    req.usuario = verificado;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};

module.exports = verificarToken;