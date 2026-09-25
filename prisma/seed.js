const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Forzando la creación/actualización del SuperAdmin...');

  const salt = await bcrypt.genSalt(10);
  const superAdminPassword = await bcrypt.hash('AdminTIC2026', salt);

  await prisma.user.upsert({
    where: { 
      email: 'oficinatic-ctei@calimaeldarien-valle.gov.co' 
    },
    update: {
      password: superAdminPassword,
      passwordHash: superAdminPassword, // Corrección del error
      role: 'SUPERADMIN'
    },
    create: {
      name: 'Oficina TIC y CTeI',
      email: 'oficinatic-ctei@calimaeldarien-valle.gov.co',
      password: superAdminPassword,
      passwordHash: superAdminPassword, // Corrección del error
      document: 'SUPERADMIN-TIC-01',
      role: 'SUPERADMIN',
    },
  });

  console.log('✅ ¡Cuenta maestra lista y blindada!');
  console.log('📧 Correo: oficinatic-ctei@calimaeldarien-valle.gov.co');
  console.log('🔑 Clave: AdminTIC2026');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });