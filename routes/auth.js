// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Endpoint: /register
 * Method: POST
 * Description: Registra un nuevo usuario en la plataforma, validando existencia y encriptando su contraseña.
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 1. Verificación de campos obligatorios
    if (!email || !password) {
      return res.status(400).json({ error: 'El email y la contraseña son obligatorios.' });
    }

    // 2. Verificar si el correo ya está registrado en la base de datos
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // 3. Encriptar la contraseña (Hashing)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Crear el usuario en la base de datos
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role || 'TOURIST', // Si no envían rol, por defecto será turista
      }
    });

    // 5. Enviar respuesta de éxito (excluyendo la contraseña por seguridad)
    res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente.',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('[AUTH ERROR]', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar el usuario.' });
  }
});

/**
 * Endpoint: /login
 * Method: POST
 * Description: Autentica al usuario y le entrega un Token (JWT) para navegar.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validar que envíen datos
    if (!email || !password) {
      return res.status(400).json({ error: 'El email y la contraseña son obligatorios.' });
    }

    // 2. Buscar al usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // 3. Comparar la contraseña ingresada con la contraseña encriptada (Hash)
    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // 4. Generar el Token (JWT)
    // Guardamos el ID y el Rol del usuario dentro del token. Durará 24 horas.
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 5. Enviar el Token al usuario
    res.status(200).json({
      status: 'success',
      message: 'Inicio de sesión exitoso.',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
});

module.exports = router;