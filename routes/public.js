const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// OBTENER CONFIGURACIÓN DEL HOME
router.get('/settings/home', async (req, res) => {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    res.json(settings || { carouselImages: [], aboutImageUrl: null });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar la configuración' });
  }
});

// OBTENER EVENTOS
router.get('/events', async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const eventos = await prisma.event.findMany({
      where: { date: { gte: hoy } },
      orderBy: { date: 'asc' }
    });
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar los eventos' });
  }
});

// ==========================================
// DIRECTORIO GLOBAL (AHORA INCLUYE LAS RESEÑAS)
// ==========================================
router.get('/', async (req, res) => {
  try {
    const comercios = await prisma.comercio.findMany({
      where: { status: 'APPROVED' },
      include: { 
        reviews: { select: { rating: true } } // <-- CRÍTICO: Traemos las estrellas para calcular el promedio en el frontend
      },
      orderBy: { id: 'desc' }
    });
    res.json(comercios);
  } catch (error) {
    res.status(500).json({ error: 'Error cargando comercios' });
  }
});

// DETALLE DE UN COMERCIO Y SUS RESEÑAS
router.get('/:id', async (req, res) => {
  try {
    const comercio = await prisma.comercio.findUnique({
      where: { id: Number(req.params.id) },
      include: { 
        services: true,
        gallery: { orderBy: { id: 'desc' } },
        reviews: { orderBy: { createdAt: 'desc' } }
      } 
    });
    
    if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado' });
    res.json(comercio);
  } catch (error) {
    res.status(500).json({ error: 'Error cargando el comercio' });
  }
});

// CREAR RESEÑA PÚBLICA SIN REGISTRO
router.post('/:id/reviews', async (req, res) => {
  try {
    const comercioId = Number(req.params.id);
    const { rating, comment, touristName, touristEmail, touristPhone, marketingConsent } = req.body;

    if (!rating || !comment || !touristName || !touristEmail) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para publicar la reseña.' });
    }

    const nuevaResena = await prisma.review.create({
      data: {
        comercioId,
        rating: Number(rating),
        comment,
        touristName,
        touristEmail,
        touristPhone: touristPhone || null,
        marketingConsent: Boolean(marketingConsent)
      }
    });

    res.status(201).json({ success: true, review: nuevaResena });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la calificación' });
  }
});

// Crear un nuevo ticket de soporte
router.post('/support', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    const ticket = await prisma.supportTicket.create({
      data: { name, email, phone, subject, message }
    });
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar el mensaje de soporte.' });
  }
});

module.exports = router;