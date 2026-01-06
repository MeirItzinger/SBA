import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo deal
  const demoDeal = await prisma.deal.upsert({
    where: { id: 'demo-deal-001' },
    update: {},
    create: {
      id: 'demo-deal-001',
      name: 'Golden Gate Restaurant Expansion',
      borrowerName: 'Maria Chen',
      programType: 'SBA_7A',
      requestedAmount: 750000,
      status: 'DRAFT',
      notes: 'Established restaurant looking to expand to second location in downtown San Francisco. Strong track record of profitability over 8 years.',
    },
  });

  console.log(`✅ Created demo deal: ${demoDeal.name}`);

  // Create initial activity
  await prisma.activity.upsert({
    where: { id: 'demo-activity-001' },
    update: {},
    create: {
      id: 'demo-activity-001',
      dealId: demoDeal.id,
      type: 'DEAL_CREATED',
      message: `Deal "${demoDeal.name}" created for ${demoDeal.borrowerName}`,
      metadata: {
        requestedAmount: 750000,
        programType: 'SBA_7A',
      },
    },
  });

  console.log('✅ Created initial activity');

  // Create another demo deal with more progress
  const analyzedDeal = await prisma.deal.upsert({
    where: { id: 'demo-deal-002' },
    update: {},
    create: {
      id: 'demo-deal-002',
      name: 'TechStart Manufacturing Equipment',
      borrowerName: 'James Rodriguez',
      programType: 'SBA_504',
      requestedAmount: 2500000,
      status: 'DRAFT',
      notes: 'Growing manufacturing company needs equipment financing for CNC machines and industrial robots.',
    },
  });

  console.log(`✅ Created second demo deal: ${analyzedDeal.name}`);

  await prisma.activity.upsert({
    where: { id: 'demo-activity-002' },
    update: {},
    create: {
      id: 'demo-activity-002',
      dealId: analyzedDeal.id,
      type: 'DEAL_CREATED',
      message: `Deal "${analyzedDeal.name}" created for ${analyzedDeal.borrowerName}`,
      metadata: {
        requestedAmount: 2500000,
        programType: 'SBA_504',
      },
    },
  });

  console.log('✅ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

