// middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// 1. Configurar dónde y cómo se guardan los archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    // Decidimos la carpeta dependiendo del tipo de archivo que estén subiendo
    if (file.fieldname === 'document') {
      uploadPath += 'documents/';
    } else if (file.fieldname === 'comercioImage') {
      uploadPath += 'comercios/';
    } else {
      uploadPath += 'profiles/'; // Por defecto
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generamos un nombre único: (timestamp actual) + (extensión original)
    // Ejemplo: 1698765432-foto.jpg
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Filtro de seguridad (Solo aceptar imágenes y PDFs)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no soportado. Solo JPG, PNG, WEBP o PDF.'), false);
  }
};

// 3. Inicializar Multer con la configuración (Límite de peso: 5MB por archivo)
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 Megabytes
});

module.exports = upload;