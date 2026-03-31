import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Criar usuário Administrator
  const adminPassword = await bcrypt.hash('Farmflow0147*', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cotaagro.com' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@cotaagro.com',
      password: adminPassword,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('✅ Administrator user created');
  console.log('   Email: admin@cotaagro.com');
  console.log('   Password: Farmflow0147*');

  // Criar produtores
  const producer1 = await prisma.producer.upsert({
    where: { phone: '+5564999999999' },
    update: {},
    create: {
      name: 'João Silva',
      phone: '+5564999999999',
      cpfCnpj: '12345678901',
      city: 'Goiânia',
      region: 'Goiânia - GO',
      subscription: {
        create: {
          plan: 'PRO',
          quotesLimit: 50,
          quotesUsed: 0,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          active: true,
        },
      },
      conversationState: {
        create: {
          step: 'IDLE',
          context: {},
        },
      },
    },
  });

  const producer2 = await prisma.producer.upsert({
    where: { phone: '+5564988888888' },
    update: {},
    create: {
      name: 'Maria Santos',
      phone: '+5564988888888',
      cpfCnpj: '98765432100',
      city: 'Rio Verde',
      region: 'Rio Verde - GO',
      subscription: {
        create: {
          plan: 'BASIC',
          quotesLimit: 10,
          quotesUsed: 3,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          active: true,
        },
      },
      conversationState: {
        create: {
          step: 'IDLE',
          context: {},
        },
      },
    },
  });

  // Criar fornecedores
  const supplier1 = await prisma.supplier.upsert({
    where: { phone: '+5564977777777' },
    update: {},
    create: {
      name: 'Agro Insumos Goiás',
      phone: '+5564977777777',
      regions: ['Goiânia - GO', 'Aparecida de Goiânia - GO', 'Senador Canedo - GO'],
      categories: ['sementes', 'fertilizantes', 'defensivos'],
      isNetworkSupplier: true,
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { phone: '+5564966666666' },
    update: {},
    create: {
      name: 'Sementes do Cerrado',
      phone: '+5564966666666',
      regions: ['Rio Verde - GO', 'Jataí - GO', 'Mineiros - GO'],
      categories: ['sementes', 'fertilizantes'],
      isNetworkSupplier: true,
    },
  });

  const supplier3 = await prisma.supplier.upsert({
    where: { phone: '+5564955555555' },
    update: {},
    create: {
      name: 'Fornecedor Local João',
      phone: '+5564955555555',
      regions: ['Goiânia - GO'],
      categories: ['sementes', 'defensivos'],
      isNetworkSupplier: false,
    },
  });

  // Vincular fornecedor ao produtor
  await prisma.producerSupplier.upsert({
    where: {
      producerId_supplierId: {
        producerId: producer1.id,
        supplierId: supplier3.id,
      },
    },
    update: {},
    create: {
      producerId: producer1.id,
      supplierId: supplier3.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`
📊 Dados criados:
  - 1 Usuário Administrator
  - 2 Produtores
  - 3 Fornecedores
  - 1 Vínculo produtor-fornecedor

🔐 Login do sistema:
  - Email: admin@cotaagro.com
  - Senha: Farmflow0147*

📱 Teste com WhatsApp:
  - Produtor 1: ${producer1.phone} (${producer1.name})
  - Produtor 2: ${producer2.phone} (${producer2.name})
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
