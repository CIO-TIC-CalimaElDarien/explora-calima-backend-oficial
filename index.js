// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar rutas
const authRoutes = require('./routes/auth');
const comerciosRoutes = require('./routes/comercios');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const reviewsRoutes = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Global Middlewares
 */
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * Rutas de la API
 */
app.use('/api/auth', authRoutes); // Aquí conectamos nuestro nuevo archivo de registro
app.use('/api/comercios', comerciosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/reviews', reviewsRoutes);

/**
 * Health Check Endpoint
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API de Explora Calima funcionando correctamente.',
    timestamp: new Date().toISOString()
  });
});

/**
 * Server Initialization
 */
app.listen(PORT, () => {
  console.log(`[SERVIDOR] Aplicación en ejecución en http://localhost:${PORT}`);
});