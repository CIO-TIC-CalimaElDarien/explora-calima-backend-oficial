const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Todos los archivos de los comercios irán a esta carpeta
    cb(null, 'uploads/comercios/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // AQUÍ ESTÁ LA MAGIA: Ahora permitimos imágenes Y archivos PDF
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Formato no válido. Solo se permiten imágenes o documentos PDF.'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter 
});

module.exports = upload;