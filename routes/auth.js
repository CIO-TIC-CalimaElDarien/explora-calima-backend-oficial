const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==========================================
// 1. RUTA DE INICIO DE SESIÓN
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`🔍 Intentando login con el correo: ${email}`);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('❌ Error: El usuario no existe en la base de datos.');
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    // Comparamos la contraseña directamente con passwordHash
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!validPassword) {
      console.log('❌ Error: La contraseña escrita no coincide con la guardada.');
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET || 'mi_secreto_super_seguro_123', 
      { expiresIn: '24h' }
    );

    console.log(`✅ ¡Login exitoso! Bienvenido ${user.fullName || 'Usuario'} (Rol: ${user.role})`);
    res.json({ token, role: user.role, userId: user.id });

  } catch (error) {
    console.error('❌ Error interno en el login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// 2. RUTA DE REGISTRO
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, document, password, role } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'El correo ya está registrado.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: {
        fullName: name,
        email,
        documentId: document,
        passwordHash: hashedPassword, // Solo usamos passwordHash
        role: role || 'COMERCIANTE'
      }
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

// ==========================================
// RUTA DE EMERGENCIA: INSTALADOR SUPERADMIN
// ==========================================
router.get('/setup', async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const pass = await bcrypt.hash('AdminTIC2026', salt);

    await prisma.user.upsert({
      where: { email: 'oficinatic-ctei@calimaeldarien-valle.gov.co' },
      update: { passwordHash: pass, role: 'SUPERADMIN' }, // Quitamos 'password'
      create: {
        fullName: 'Oficina TIC',
        email: 'oficinatic-ctei@calimaeldarien-valle.gov.co',
        passwordHash: pass, // Quitamos 'password'
        documentId: 'SUPERADMIN-TIC-01',
        role: 'SUPERADMIN',
      },
    });
    res.send('<h1 style="color: green; text-align: center; margin-top: 50px;">✅ ¡SuperAdmin creado con éxito! Cierra esta pestaña y ve a iniciar sesión.</h1>');
  } catch (error) {
    res.send(`<h1 style="color: red;">❌ Error:</h1><pre>${error.message}</pre>`);
  }
});

module.exports = router;