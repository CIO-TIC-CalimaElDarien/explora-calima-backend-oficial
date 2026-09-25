const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); // Usa 'bcryptjs' si es la que tienes instalada en package.json

const prisma = new PrismaClient();

async function main() {
  const emailAdmin = 'oficinatic-ctei@calimaeldarien-valle.gov.co';
  const plainPassword = 'Admin_Calima2026*';

  // 1. Encriptar la contraseña para el campo passwordHash
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // 2. Insertar el registro en la tabla User y vincularlo con la tabla Admin
  const superadmin = await prisma.user.create({
    data: {
      email: emailAdmin,
      passwordHash: hashedPassword,
      fullName: 'Super Administrador TIC',
      role: 'SUPERADMIN',
      adminProfile: {
        create: {
          department: 'Oficina TIC y CTeI'
        }
      }
    },
  });

  console.log('✅ Superadmin creado con éxito en Supabase:', superadmin.email);
  console.log('🔑 Contraseña temporal (cópiala):', plainPassword);
}

main()
  .catch((e) => {
    console.error("❌ Error creando admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });