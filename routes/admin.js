const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const upload = require('../middlewares/upload'); 

const verificarToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Acceso denegado.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_super_seguro_123');
    next();
  } catch (error) { res.status(401).json({ error: 'Token inválido.' }); }
};

const verificarAdmin = (req, res, next) => {
  if (!req.user || !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Prohibido.' });
  }
  next();
};

const verificarSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Solo el Super Administrador puede hacer esto.' });
  }
  next();
};

// ==========================================
// 1. TAREAS DE ALCALDÍA
// ==========================================
router.get('/stats', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const totalComercios = await prisma.comercio.count();
    const aprobados = await prisma.comercio.count({ where: { status: 'APPROVED' } });
    const pendientes = await prisma.comercio.count({ where: { status: 'PENDING' } });
    const totalReviews = await prisma.review.count();
    const comerciosPorCategoria = await prisma.comercio.groupBy({ by: ['category'], _count: { category: true } });
    res.json({ totalComercios, aprobados, pendientes, totalReviews, comerciosPorCategoria });
  } catch (error) { res.status(500).json({ error: 'Error al cargar estadísticas' }); }
});

router.get('/comercios', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const comercios = await prisma.comercio.findMany({ orderBy: { id: 'desc' } });
    res.json(comercios);
  } catch (error) { res.status(500).json({ error: 'Error interno' }); }
});

router.put('/comercios/:id/status', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const comercioActualizado = await prisma.comercio.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status } });
    res.json({ success: true, comercio: comercioActualizado });
  } catch (error) { res.status(500).json({ error: 'Error al actualizar' }); }
});

router.put('/comercios/:id/resolve-update', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; 
    const comercio = await prisma.comercio.findUnique({ where: { id: Number(id) } });
    if (!comercio || !comercio.pendingUpdate) return res.status(400).json({ error: 'Sin borrador' });
    const draft = typeof comercio.pendingUpdate === 'string' ? JSON.parse(comercio.pendingUpdate) : comercio.pendingUpdate;

    if (action === 'APPROVE') {
      const comercioActualizado = await prisma.comercio.update({
        where: { id: Number(id) },
        data: {
          name: draft.name || comercio.name, category: draft.category || comercio.category,
          description: draft.description || comercio.description, imageUrl: draft.imageUrl || comercio.imageUrl,
          logoUrl: draft.logoUrl || comercio.logoUrl, brandColor: draft.brandColor || comercio.brandColor, pendingUpdate: null 
        }
      });
      return res.json({ success: true, comercio: comercioActualizado });
    } else {
      const comercioActualizado = await prisma.comercio.update({ where: { id: Number(id) }, data: { pendingUpdate: null } });
      return res.json({ success: true, comercio: comercioActualizado });
    }
  } catch (error) { res.status(500).json({ error: 'Error resolviendo actualización' }); }
});

router.get('/events', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const events = await prisma.event.findMany({ orderBy: { date: 'desc' } });
    res.json(events);
  } catch (error) { res.status(500).json({ error: 'Error al cargar eventos' }); }
});

router.post('/events', verificarToken, verificarAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, date } = req.body;
    const newEvent = await prisma.event.create({
      data: { title, description, date: new Date(date), imageUrl: req.file ? `/uploads/comercios/${req.file.filename}` : null }
    });
    res.status(201).json({ success: true, event: newEvent });
  } catch (error) { res.status(500).json({ error: 'Error al crear evento' }); }
});

router.delete('/events/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Error al eliminar evento' }); }
});

// ==========================================
// 2. TAREAS DE SUPER-ADMIN
// ==========================================
router.get('/settings', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (!settings) settings = await prisma.siteSettings.create({ data: { id: 1, carouselImages: [] } });
    res.json(settings);
  } catch (error) { res.status(500).json({ error: 'Error interno' }); }
});

router.put('/settings/about-image', verificarToken, verificarSuperAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Falta la imagen' });
    const settings = await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: { aboutImageUrl: `/uploads/comercios/${req.file.filename}` },
      create: { id: 1, aboutImageUrl: `/uploads/comercios/${req.file.filename}`, carouselImages: [] }
    });
    res.json({ success: true, settings });
  } catch (error) { res.status(500).json({ error: 'Error al subir imagen' }); }
});

router.post('/settings/carousel', verificarToken, verificarSuperAdmin, (req, res) => {
  const uploadMultiple = upload.array('images', 5);
  uploadMultiple(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'Error al subir imágenes.' });
    try {
      if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No se recibieron imágenes.' });
      const newImages = req.files.map(f => `/uploads/comercios/${f.filename}`);
      let settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
      let currentImages = [];
      if (settings && settings.carouselImages) {
        if (typeof settings.carouselImages === 'string') { try { currentImages = JSON.parse(settings.carouselImages); } catch(e){} } 
        else if (Array.isArray(settings.carouselImages)) { currentImages = settings.carouselImages; }
      }
      settings = await prisma.siteSettings.upsert({
        where: { id: 1 },
        update: { carouselImages: [...currentImages, ...newImages] },
        create: { id: 1, carouselImages: [...currentImages, ...newImages] }
      });
      res.json({ success: true, settings });
    } catch (error) { res.status(500).json({ error: 'Error interno' }); }
  });
});

router.delete('/settings/carousel', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    let settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    let currentImages = [];
    if (settings && settings.carouselImages) {
      if (typeof settings.carouselImages === 'string') { try { currentImages = JSON.parse(settings.carouselImages); } catch(e){} } 
      else if (Array.isArray(settings.carouselImages)) { currentImages = settings.carouselImages; }
    }
    settings = await prisma.siteSettings.update({
      where: { id: 1 },
      data: { carouselImages: currentImages.filter(img => img !== imageUrl) }
    });
    res.json({ success: true, settings });
  } catch (error) { res.status(500).json({ error: 'Error al eliminar' }); }
});

// ==========================================
// MÓDULO DE USUARIOS (CORREGIDO)
// ==========================================
router.get('/users', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const dbUsers = await prisma.user.findMany({ select: { id: true, fullName: true, email: true, role: true, documentId: true } });
    // Traducimos los datos para que el frontend React no se rompa
    const users = dbUsers.map(u => ({ id: u.id, name: u.fullName, email: u.email, role: u.role, document: u.documentId }));
    res.json(users);
  } catch (error) { res.status(500).json({ error: 'Error al cargar usuarios' }); }
});

router.post('/users', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, document, role } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'El correo ya está registrado.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: { 
        fullName: name, 
        email, 
        documentId: document, 
        passwordHash: hashedPassword, 
        role 
      }
    });
    
    // Retornamos el formato traducido para la tabla de React
    res.json({ success: true, user: { id: newUser.id, name: newUser.fullName, email: newUser.email, role: newUser.role, document: newUser.documentId } });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Error al crear usuario' }); 
  }
});

router.put('/users/:id/role', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { role: req.body.role },
      select: { id: true, fullName: true, email: true, role: true, documentId: true }
    });
    res.json({ success: true, user: { id: updatedUser.id, name: updatedUser.fullName, email: updatedUser.email, role: updatedUser.role, document: updatedUser.documentId } });
  } catch (error) { res.status(500).json({ error: 'Error al cambiar rol' }); }
});

router.delete('/users/:id', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Error al eliminar usuario' }); }
});

// ==========================================
// 5. MÓDULO DE SOPORTE TÉCNICO
// ==========================================
router.get('/support', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(tickets);
  } catch (error) { res.status(500).json({ error: 'Error al cargar tickets' }); }
});

router.put('/support/:id/status', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.update({
      where: { id: Number(req.params.id) },
      data: { status: req.body.status }
    });
    res.json({ success: true, ticket });
  } catch (error) { res.status(500).json({ error: 'Error al actualizar ticket' }); }
});

module.exports = router;