import bcrypt from 'bcryptjs';
import prisma from './lib/prisma.js';

async function main() {
  const email = 'super@dashmint.com';
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log('Seed: Super admin user already exists.');
    return;
  }

  const passwordHash = await bcrypt.hash('adminpassword', 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      globalRole: 'SUPER_ADMIN'
    }
  });

  console.log('Seed: Super admin user created successfully (email: super@dashmint.com, password: adminpassword).');
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
