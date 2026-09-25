const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const upload = require('../middlewares/upload');

const verificarToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Acceso denegado' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_super_seguro_123');
    next();
  } catch (error) { res.status(401).json({ error: 'Token inválido' }); }
};

// GET: Obtener TODOS los negocios del usuario (Ahora soporta múltiples)
router.get('/mine', verificarToken, async (req, res) => {
  try {
    const comercios = await prisma.comercio.findMany({
      where: { userId: req.user.userId },
      orderBy: { id: 'desc' },
      include: { services: { orderBy: { id: 'desc' } }, gallery: { orderBy: { id: 'desc' } } }
    });
    // Devolvemos el array. Si no hay, devolvemos array vacío.
    res.json(comercios || []); 
  } catch (error) { res.status(500).json({ error: 'Error del servidor' }); }
});

// POST: Crear comercio (Añadido logo, color, lat, lng y TAGS / PALABRAS CLAVE)
router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'logo', maxCount: 1 }, { name: 'legalDoc', maxCount: 1 }]), async (req, res) => {
  try {
    // 1. Extraemos los 'tags' que envía el frontend
    const { name, category, description, userId, address, brandColor, lat, lng, tags } = req.body;
    
    const imageUrl = req.files && req.files['image'] ? `/uploads/comercios/${req.files['image'][0].filename}` : null;
    const logoUrl = req.files && req.files['logo'] ? `/uploads/comercios/${req.files['logo'][0].filename}` : null;
    const legalDocUrl = req.files && req.files['legalDoc'] ? `/uploads/comercios/${req.files['legalDoc'][0].filename}` : null;

    if (!legalDocUrl) {
      return res.status(400).json({ error: 'El documento legal es obligatorio.' });
    }

    // 2. Transformamos las palabras clave (que vienen como texto) a un arreglo (Array)
    let tagsParsed = [];
    if (tags) {
      try { 
        tagsParsed = JSON.parse(tags); 
      } catch(e) {
        console.error("Error al procesar las palabras clave:", e);
      }
    }

    // 3. Guardamos el comercio incluyendo el arreglo de tags
    const nuevoComercio = await prisma.comercio.create({
      data: { 
        name, category, description, address, 
        imageUrl, logoUrl, legalDocUrl, 
        brandColor: brandColor || '#16a34a',
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        tags: tagsParsed, // <-- AQUÍ SE GUARDAN LAS PALABRAS CLAVE
        status: 'PENDING', 
        userId: userId && userId !== 'null' ? Number(userId) : null 
      }
    });
    res.status(201).json({ success: true, comercio: nuevoComercio });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Error al crear' }); 
  }
});

// PUT: Editar Perfil (Genera Borrador)
router.put('/:id', verificarToken, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), async (req, res) => {
  try {
    const comercioId = Number(req.params.id);
    const { name, category, description } = req.body;
    const comercio = await prisma.comercio.findUnique({ where: { id: comercioId } });
    if (!comercio || comercio.userId !== req.user.userId) return res.status(403).json({ error: 'Sin permiso.' });

    const draft = { name, category, description };
    if (req.files && req.files['image']) draft.imageUrl = `/uploads/comercios/${req.files['image'][0].filename}`;
    if (req.files && req.files['logo']) draft.logoUrl = `/uploads/comercios/${req.files['logo'][0].filename}`;

    const comercioActualizado = await prisma.comercio.update({
      where: { id: comercioId },
      data: { pendingUpdate: draft },
      include: { services: { orderBy: { id: 'desc' } }, gallery: { orderBy: { id: 'desc' } } }
    });
    res.json({ success: true, comercio: comercioActualizado });
  } catch (error) { res.status(500).json({ error: 'Error al actualizar' }); }
});

// PATCH: Cambio instantáneo de color (NO genera borrador, se aprueba solo)
router.patch('/:id/color', verificarToken, async (req, res) => {
  try {
    const comercioId = Number(req.params.id);
    const { brandColor } = req.body;
    
    const comercio = await prisma.comercio.findUnique({ where: { id: comercioId } });
    if (!comercio || comercio.userId !== req.user.userId) return res.status(403).json({ error: 'Sin permiso.' });

    const comercioActualizado = await prisma.comercio.update({
      where: { id: comercioId },
      data: { brandColor },
      include: { services: { orderBy: { id: 'desc' } }, gallery: { orderBy: { id: 'desc' } } }
    });
    res.json({ success: true, comercio: comercioActualizado });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar color' });
  }
});

// ==========================================
// RUTAS DE SERVICIOS
// ==========================================
router.post('/:id/services', verificarToken, upload.single('image'), async (req, res) => {
  try {
    const comercioId = Number(req.params.id);
    const { title, description, price } = req.body;
    const imageUrl = req.file ? `/uploads/comercios/${req.file.filename}` : null;
    const nuevoServicio = await prisma.service.create({ data: { comercioId, title, description, imageUrl, price: price ? parseFloat(price) : null } });
    res.status(201).json({ success: true, service: nuevoServicio });
  } catch (error) { res.status(500).json({ error: 'Error al guardar' }); }
});
router.put('/:id/services/:serviceId', verificarToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, price } = req.body;
    const datosActualizar = { title, description, price: price ? parseFloat(price) : null };
    if (req.file) datosActualizar.imageUrl = `/uploads/comercios/${req.file.filename}`;
    const servicioActualizado = await prisma.service.update({ where: { id: Number(req.params.serviceId) }, data: datosActualizar });
    res.json({ success: true, service: servicioActualizado });
  } catch (error) { res.status(500).json({ error: 'Error al editar' }); }
});
router.delete('/:id/services/:serviceId', verificarToken, async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: Number(req.params.serviceId) } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Error al eliminar' }); }
});

// ==========================================
// RUTAS DE GALERÍA
// ==========================================
router.post('/:id/gallery', verificarToken, upload.array('images', 5), async (req, res) => {
  try {
    const comercioId = Number(req.params.id);
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No se subieron imágenes.' });
    const galleryData = req.files.map(f => ({ comercioId, imageUrl: `/uploads/comercios/${f.filename}` }));
    await prisma.galleryImage.createMany({ data: galleryData });
    const updatedGallery = await prisma.galleryImage.findMany({ where: { comercioId }, orderBy: { id: 'desc' } });
    res.status(201).json({ success: true, gallery: updatedGallery });
  } catch (error) { res.status(500).json({ error: 'Error al guardar imágenes.' }); }
});
router.delete('/:id/gallery/:imageId', verificarToken, async (req, res) => {
  try {
    await prisma.galleryImage.delete({ where: { id: Number(req.params.imageId) } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;