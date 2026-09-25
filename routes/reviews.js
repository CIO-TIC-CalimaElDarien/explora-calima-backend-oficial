const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Ruta pública: Crear una nueva reseña para un comercio
router.post('/', async (req, res) => {
  try {
    const { rating, comment, comercioId, userId } = req.body;

    // Validación básica
    if (!rating || !comercioId) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (rating y comercioId)' });
    }

    const nuevaReview = await prisma.review.create({
      data: {
        rating: Number(rating),
        comment: comment || '',
        comercioId: Number(comercioId),
        // Si el turista está logueado, guardamos su ID. Si no, queda como anónimo (null)
        userId: userId ? Number(userId) : null
      }
    });

    res.status(201).json({ success: true, review: nuevaReview });
  } catch (error) {
    console.error("❌ Error creando reseña:", error);
    res.status(500).json({ error: 'Error al guardar la reseña' });
  }
});

// Ruta pública: Obtener todas las reseñas de un comercio específico
router.get('/comercio/:comercioId', async (req, res) => {
  try {
    const { comercioId } = req.params;
    
    const reviews = await prisma.review.findMany({
      where: { comercioId: Number(comercioId) },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true } // Opcional: trae el correo de quien comentó (si existe)
        }
      }
    });

    res.json(reviews);
  } catch (error) {
    console.error("❌ Error cargando reseñas:", error);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

module.exports = router;