const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configuración con las variables que pondremos en Render
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Soporte para PDFs (RUT) y fotografías
    if (file.mimetype === 'application/pdf') {
      return { folder: 'comercios', format: 'pdf', resource_type: 'raw' };
    }
    return { folder: 'comercios', format: 'jpg', resource_type: 'image' };
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Formato no válido. Solo se permiten imágenes o documentos PDF.'));
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });
module.exports = upload;