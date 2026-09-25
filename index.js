const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');

const app = express();

// 1. Seguridad de Cabeceras HTTP (Permitiendo mapas externos)
app.use(helmet({ 
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false // <- Esta es la clave para desbloquear OpenStreetMap
}));

// 2. Limitador de peticiones (Previene ataques DDoS y Fuerza Bruta)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 150, // Límite de 150 peticiones por IP cada 15 min
  message: { error: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.' }
});
app.use('/api', limiter);

// 4. Prevención de contaminación de parámetros HTTP
app.use(hpp());

// 5. Compresión GZIP para respuestas más rápidas y ligeras
app.use(compression());

app.use(cors());
app.use(express.json());

// Caché optimizada para imágenes estáticas (30 días)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '30d',
  etag: true
}));

// Importar rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/comercios', require('./routes/comercios')); // <- LÍNEA AÑADIDA: Desbloquea el panel del comerciante

console.log("¡RUTAS DE COMERCIOS CONECTADAS CORRECTAMENTE!"); // <- El rastreador

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});