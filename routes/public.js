// routes/public.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Endpoint: /comercios
 * Method: GET
 * Description: Obtiene el directorio de comercios aprobados.
 * Público: No requiere autenticación.
 */
router.get('/comercios', async (req, res) => {
  try {
    // Permite buscar por categoría usando la URL (ej: /comercios?category=HOSPEDAJE)
    const { category } = req.query;
    
    // Configuramos los filtros de la búsqueda
    let queryOptions = {
      where: {
        status: 'APPROVED' // REGLA DE ORO: Solo mostrar los aprobados por la Alcaldía
      },
      // Seleccionamos solo los campos públicos (ocultamos legalDocUrl y userId)
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        address: true,
        lat: true,
        lng: true,
        services: true,
        reviews: true    
      }
    };

    // Si el turista seleccionó una categoría específica, aplicamos el filtro
    if (category) {
      queryOptions.where.category = category;
    }

    // Buscamos en PostgreSQL
    const comercios = await prisma.comercio.findMany(queryOptions);

    // Respondemos con los datos
    res.status(200).json({
      status: 'success',
      total: comercios.length,
      data: comercios
    });

  } catch (error) {
    console.error('[PUBLIC API ERROR]', error);
    res.status(500).json({ error: 'Error interno al cargar el directorio turístico.' });
  }
});

module.exports = router;