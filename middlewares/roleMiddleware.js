// middlewares/roleMiddleware.js

/**
 * Middleware para autorizar roles específicos.
 * Se debe usar DESPUÉS de verifyToken.
 * @param  {...String} allowedRoles - Lista de roles permitidos (ej. 'SUPERADMIN', 'ADMIN')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user viene del authMiddleware (verifyToken)
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'No se pudo identificar el rol del usuario.' });
    }

    // Verificamos si el rol del usuario está en la lista de roles permitidos para esta ruta
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Acceso denegado. Se requiere nivel de acceso: ${allowedRoles.join(' o ')}.` 
      });
    }

    // Si tiene el rol adecuado, lo dejamos pasar
    next();
  };
};

module.exports = authorizeRoles;