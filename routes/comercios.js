// routes/comercios.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middlewares/authMiddleware'); // Importamos a nuestro guardia
const authorizeRoles = require('../middlewares/roleMiddleware');

const router = express.Router();
const prisma = new PrismaClient();
const upload = require('../middlewares/uploadMiddleware');

router.post('/', verifyToken, upload.single('document'), async (req, res) => {
  try {
    // 1. Extraer datos (ya no extraemos 'legalDocUrl' del body porque ahora viene un archivo físico)
    const { name, description, category, address, lat, lng } = req.body;
    const userId = req.user.userId;

// 2. Manejo flexible del documento (si viene el archivo lo usamos, si no, lo dejamos vacío o en modo texto por compatibilidad)
    let finalDocUrl = '';
    
    if (req.file) {
      // Si subieron un archivo físico real con Multer
      finalDocUrl = `/${req.file.path.replace(/\\/g, '/')}`;
    } else if (req.body.document) {
      // Si por alguna razón la petición lo mandó como texto en el body (compatibilidad con Thunder Client)
      finalDocUrl = req.body.document;
    } else {
      // Si no enviaron nada, por ahora lo dejamos vacío para facilitar pruebas
      finalDocUrl = 'Pendiente_de_subida'; 
    }

    // 3. Verificaciones de seguridad
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return res.status(404).json({ error: 'Usuario no encontrado en el sistema.' });
    }

    const existingComercio = await prisma.comercio.findUnique({ where: { userId } });
    if (existingComercio) {
      return res.status(400).json({ error: 'Este usuario ya tiene un comercio registrado.' });
    }

    // 4. Guardar en base de datos
    const newComercio = await prisma.comercio.create({
      data: {
        userId,
        name,
        description,
        category,
        address,
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lng) || 0,
        legalDocUrl: finalDocUrl
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Comercio registrado con éxito. Pendiente de verificación.',
      comercio: newComercio
    });

  } catch (error) {
    console.error('[COMERCIO ERROR]', error);
    res.status(500).json({ error: 'Error interno al registrar el comercio.' });
  }
});

module.exports = router;