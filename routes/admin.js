// routes/admin.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Endpoint: /comercios/pending
 * Method: GET
 * Description: Obtiene la lista de todos los comercios que esperan aprobación.
 * Permisos: Solo ADMIN y SUPERADMIN
 */
router.get('/comercios/pending', verifyToken, authorizeRoles('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const pendingComercios = await prisma.comercio.findMany({
      where: { status: 'PENDING' },
      include: { 
        user: { select: { email: true } } // Traemos el correo del dueño por si el funcionario necesita contactarlo
      }
    });

    res.status(200).json({
      status: 'success',
      total: pendingComercios.length,
      data: pendingComercios
    });
  } catch (error) {
    console.error('[ADMIN GET PENDING ERROR]', error);
    res.status(500).json({ error: 'Error al obtener la lista de comercios pendientes.' });
  }
});

/**
 * Endpoint: /comercios/:id/status
 * Method: PATCH
 * Description: Aprueba o rechaza la solicitud de un comercio.
 * Permisos: Solo ADMIN y SUPERADMIN
 */
router.patch('/comercios/:id/status', verifyToken, authorizeRoles('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Debe ser 'APPROVED' o 'REJECTED'

    // 1. Validar que la instrucción sea correcta
    if (!['APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido. Use APPROVED, REJECTED o SUSPENDED.' });
    }

    // 2. Actualizar el comercio en la base de datos
    const comercioActualizado = await prisma.comercio.update({
      where: { id: parseInt(id) },
      data: { 
        status: status,
        verifiedAt: new Date() // Guardamos la fecha y hora exacta de la verificación
      }
    });

    res.status(200).json({
      status: 'success',
      message: `El comercio ha sido actualizado exitosamente al estado: ${status}`,
      comercio: comercioActualizado
    });
  } catch (error) {
    console.error('[ADMIN STATUS UPDATE ERROR]', error);
    // Si el error es porque el ID no existe en Prisma, lo manejamos amablemente
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'No se encontró ningún comercio con ese ID.' });
    }
    res.status(500).json({ error: 'Error interno al actualizar el estado del comercio.' });
  }
});

module.exports = router;