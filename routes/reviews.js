// routes/reviews.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Endpoint: / (Crear Reseña)
 * Method: POST
 * Description: Permite a un usuario autenticado calificar un comercio.
 * Protegido: Requiere Token.
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { comercioId, rating, comment, photoUrl } = req.body;
    const userId = req.user.userId;

    // 1. Validaciones básicas
    if (!comercioId || !rating) {
      return res.status(400).json({ error: 'El ID del comercio y la calificación (rating) son obligatorios.' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La calificación debe ser un número entre 1 y 5.' });
    }

    // 2. Verificar que el comercio existe y está aprobado
    const comercio = await prisma.comercio.findUnique({ where: { id: parseInt(comercioId) } });
    
    if (!comercio || comercio.status !== 'APPROVED') {
      return res.status(404).json({ error: 'El comercio no existe o aún no está aprobado para recibir reseñas.' });
    }

    // 3. Crear la reseña en la base de datos
    const nuevaResena = await prisma.review.create({
      data: {
        userId,
        comercioId: parseInt(comercioId),
        rating: parseInt(rating),
        comment,
        photoUrl
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Reseña publicada exitosamente.',
      review: nuevaResena
    });

  } catch (error) {
    console.error('[REVIEW ERROR]', error);
    res.status(500).json({ error: 'Error interno al publicar la reseña.' });
  }
});

module.exports = router;