// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // 1. Buscar el token en los encabezados (Headers) de la petición
  const tokenHeader = req.header('Authorization');

  // Si no hay token, se bloquea el acceso inmediatamente
  if (!tokenHeader) {
    return res.status(401).json({ error: 'Acceso denegado. Se requiere un Token de autenticación.' });
  }

  try {
    // 2. Limpiar el token (El estándar indica que se envía como "Bearer <TOKEN>")
    const token = tokenHeader.replace('Bearer ', '');

    // 3. Verificar que el token sea auténtico usando nuestro secreto
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Si es válido, extraemos los datos del usuario (id y rol) y los guardamos en 'req.user'
    // para que la ruta final sepa exactamente quién está haciendo la petición.
    req.user = verified;
    
    // 5. Permitir que la petición continúe su camino
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado. Por favor, inicie sesión nuevamente.' });
  }
};

module.exports = verifyToken;