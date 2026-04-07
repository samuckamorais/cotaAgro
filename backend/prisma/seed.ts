import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database com suporte Multi-Tenant...\n');

  // ===================================
  // CRIAR TENANTS
  // ===================================
  console.log('📦 Criando tenants...');

  const tenantDefault = await prisma.tenant.upsert({
    where: { slug: 'fazenda-modelo' },
    update: {},
    create: {
      name: 'Fazenda Modelo',
      slug: 'fazenda-modelo',
      email: 'contato@fazendamodelo.com.br',
      active: true,
    },
  });

  const tenantCooperativa = await prisma.tenant.upsert({
    where: { slug: 'cooperativa-abc' },
    update: {},
    create: {
      name: 'Cooperativa ABC',
      slug: 'cooperativa-abc',
      email: 'admin@cooperativaabc.com.br',
      active: true,
    },
  });

  console.log(`✅ Tenant 1: ${tenantDefault.name} (${tenantDefault.slug})`);
  console.log(`✅ Tenant 2: ${tenantCooperativa.name} (${tenantCooperativa.slug})\n`);

  // ===================================
  // CRIAR USUÁRIOS
  // ===================================
  console.log('👤 Criando usuários...');

  const adminPassword = await bcrypt.hash('Farmflow0147*', 10);

  // Admin do Tenant 1 (Fazenda Modelo)
  const adminTenant1 = await prisma.user.upsert({
    where: { email: 'admin@fazendamodelo.com' },
    update: {},
    create: {
      name: 'Admin Fazenda Modelo',
      email: 'admin@fazendamodelo.com',
      password: adminPassword,
      role: 'ADMIN',
      tenantId: tenantDefault.id,
      active: true,
    },
  });

  // Admin do Tenant 2 (Cooperativa ABC)
  const adminTenant2 = await prisma.user.upsert({
    where: { email: 'admin@cooperativaabc.com' },
    update: {},
    create: {
      name: 'Admin Cooperativa ABC',
      email: 'admin@cooperativaabc.com',
      password: adminPassword,
      role: 'ADMIN',
      tenantId: tenantCooperativa.id,
      active: true,
    },
  });

  console.log(`✅ Admin Tenant 1: ${adminTenant1.email}`);
  console.log(`✅ Admin Tenant 2: ${adminTenant2.email}\n`);

  // ===================================
  // CRIAR FORNECEDORES DA REDE (tenantId = null)
  // ===================================
  console.log('🌐 Criando fornecedores da rede...');

  const networkSupplier1 = await prisma.supplier.create({
    data: {
      tenantId: null, // Fornecedor da rede
      name: 'Agro Insumos Nacional',
      phone: '+5511999999999',
      regions: ['São Paulo - SP', 'Goiânia - GO', 'Brasília - DF'],
      categories: ['sementes', 'fertilizantes', 'defensivos'],
      isNetworkSupplier: true,
    },
  });

  const networkSupplier2 = await prisma.supplier.create({
    data: {
      tenantId: null, // Fornecedor da rede
      name: 'Sementes do Brasil',
      phone: '+5511988888888',
      regions: ['Rio Verde - GO', 'Jataí - GO', 'Mineiros - GO'],
      categories: ['sementes'],
      isNetworkSupplier: true,
    },
  });

  console.log(`✅ Fornecedor Rede 1: ${networkSupplier1.name}`);
  console.log(`✅ Fornecedor Rede 2: ${networkSupplier2.name}\n`);

  // ===================================
  // TENANT 1: Fazenda Modelo
  // ===================================
  console.log('🏢 Criando dados para TENANT 1 (Fazenda Modelo)...');

  // Produtores do Tenant 1
  const producer1T1 = await prisma.producer.create({
    data: {
      tenantId: tenantDefault.id,
      name: 'João Silva',
      phone: '+5564999999999',
      cpfCnpj: '12345678901',
      city: 'Goiânia',
      region: 'Goiânia - GO',
      subscription: {
        create: {
          tenantId: tenantDefault.id,
          plan: 'PRO',
          quotesLimit: 50,
          quotesUsed: 0,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          active: true,
        },
      },
      conversationState: {
        create: {
          tenantId: tenantDefault.id,
          step: 'IDLE',
          context: {},
        },
      },
    },
  });

  const producer2T1 = await prisma.producer.create({
    data: {
      tenantId: tenantDefault.id,
      name: 'Maria Santos',
      phone: '+5564988888888',
      cpfCnpj: '98765432100',
      city: 'Rio Verde',
      region: 'Rio Verde - GO',
      subscription: {
        create: {
          tenantId: tenantDefault.id,
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
          tenantId: tenantDefault.id,
          step: 'IDLE',
          context: {},
        },
      },
    },
  });

  // Fornecedor próprio do Tenant 1
  const supplierT1 = await prisma.supplier.create({
    data: {
      tenantId: tenantDefault.id,
      name: 'Fornecedor Local Fazenda',
      phone: '+5564955555555',
      regions: ['Goiânia - GO'],
      categories: ['sementes', 'defensivos'],
      isNetworkSupplier: false,
    },
  });

  // Vincular fornecedor ao produtor
  await prisma.producerSupplier.create({
    data: {
      tenantId: tenantDefault.id,
      producerId: producer1T1.id,
      supplierId: supplierT1.id,
    },
  });

  console.log(`✅ Produtor 1: ${producer1T1.name}`);
  console.log(`✅ Produtor 2: ${producer2T1.name}`);
  console.log(`✅ Fornecedor próprio: ${supplierT1.name}\n`);

  // ===================================
  // TENANT 2: Cooperativa ABC
  // ===================================
  console.log('🏢 Criando dados para TENANT 2 (Cooperativa ABC)...');

  // Produtores do Tenant 2
  const producer1T2 = await prisma.producer.create({
    data: {
      tenantId: tenantCooperativa.id,
      name: 'Carlos Oliveira',
      phone: '+5564977777777',
      cpfCnpj: '12345678901', // Mesmo CPF do Tenant 1 (permitido!)
      city: 'Jataí',
      region: 'Jataí - GO',
      subscription: {
        create: {
          tenantId: tenantCooperativa.id,
          plan: 'ENTERPRISE',
          quotesLimit: 100,
          quotesUsed: 5,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          active: true,
        },
      },
      conversationState: {
        create: {
          tenantId: tenantCooperativa.id,
          step: 'IDLE',
          context: {},
        },
      },
    },
  });

  // Fornecedor próprio do Tenant 2
  const supplierT2 = await prisma.supplier.create({
    data: {
      tenantId: tenantCooperativa.id,
      name: 'Agro Cooperativa Local',
      phone: '+5564966666666',
      regions: ['Jataí - GO', 'Mineiros - GO'],
      categories: ['fertilizantes', 'defensivos'],
      isNetworkSupplier: false,
    },
  });

  console.log(`✅ Produtor 1: ${producer1T2.name}`);
  console.log(`✅ Fornecedor próprio: ${supplierT2.name}\n`);

  // ===================================
  // SUMÁRIO
  // ===================================
  console.log('✅ Database seeded com sucesso!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 DADOS CRIADOS:');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('🏢 TENANTS:');
  console.log(`   • ${tenantDefault.name} (${tenantDefault.slug})`);
  console.log(`   • ${tenantCooperativa.name} (${tenantCooperativa.slug})\n`);

  console.log('🌐 FORNECEDORES DA REDE (acessíveis por todos):');
  console.log(`   • ${networkSupplier1.name} - ${networkSupplier1.phone}`);
  console.log(`   • ${networkSupplier2.name} - ${networkSupplier2.phone}\n`);

  console.log('🔐 LOGINS DO SISTEMA:');
  console.log('   Tenant 1 (Fazenda Modelo):');
  console.log(`     Email: ${adminTenant1.email}`);
  console.log('     Senha: Farmflow0147*\n');
  console.log('   Tenant 2 (Cooperativa ABC):');
  console.log(`     Email: ${adminTenant2.email}`);
  console.log('     Senha: Farmflow0147*\n');

  console.log('📱 TESTE WHATSAPP - TENANT 1:');
  console.log(`   • ${producer1T1.name}: ${producer1T1.phone}`);
  console.log(`   • ${producer2T1.name}: ${producer2T1.phone}\n`);

  console.log('📱 TESTE WHATSAPP - TENANT 2:');
  console.log(`   • ${producer1T2.name}: ${producer1T2.phone}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🔒 ISOLAMENTO MULTI-TENANT ATIVO!');
  console.log('   Cada tenant só vê seus próprios dados.');
  console.log('   Fornecedores da rede são acessíveis por todos.');
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
