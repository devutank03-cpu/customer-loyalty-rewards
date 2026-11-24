import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial rewards catalog and demo batch...')

  // 1. Seed Rewards
  const defaultRewards = [
    {
      id: 'rew-1',
      title: 'Factory Branded Steel Thermos (500ml)',
      description: 'Double-walled vacuum insulated stainless steel thermos with laser-engraved eco partner badge.',
      pointsCost: 50,
      stock: 25,
      active: true,
    },
    {
      id: 'rew-2',
      title: 'Professional Multi-Tool Work Set',
      description: '14-in-1 heavy duty stainless steel folding pocket tool with reinforced ballistic nylon belt sheath.',
      pointsCost: 150,
      stock: 12,
      active: true,
    },
    {
      id: 'rew-3',
      title: 'Rugged Waterproof Factory Duffel',
      description: 'Heavy duty 45L industrial weather-sealed gear transport duffel with waterproof zippers.',
      pointsCost: 300,
      stock: 8,
      active: true,
    },
    {
      id: 'rew-4',
      title: 'Solar Fast-Charge Power Bank (20,000mAh)',
      description: 'High-capacity rugged power bank with dual USB-C PD outputs and monocrystalline solar panel.',
      pointsCost: 200,
      stock: 15,
      active: true,
    },
  ]

  for (const reward of defaultRewards) {
    await prisma.rewardItem.upsert({
      where: { id: reward.id },
      update: reward,
      create: reward,
    })
  }

  // 2. Seed a Demo Production Batch with ready-to-test Box Codes
  const existingBatch = await prisma.batch.findFirst({
    where: { name: 'BATCH-2026-ALPHA' },
  })

  if (!existingBatch) {
    const batch = await prisma.batch.create({
      data: {
        name: 'BATCH-2026-ALPHA',
        productName: 'Eco Thermal Tumbler 750ml',
        pointsPerCode: 50,
        quantity: 5,
        codes: {
          create: [
            { code: 'BOX-DEMO-0001', status: 'UNCLAIMED' },
            { code: 'BOX-DEMO-0002', status: 'UNCLAIMED' },
            { code: 'BOX-DEMO-0003', status: 'UNCLAIMED' },
            { code: 'BOX-DEMO-0004', status: 'UNCLAIMED' },
            { code: 'BOX-DEMO-0005', status: 'UNCLAIMED' },
          ],
        },
      },
    })
    console.log(`Created sample batch ${batch.name} with 5 demo codes: BOX-DEMO-0001 through BOX-DEMO-0005`)
  }

  console.log('Database seeding successfully finished!')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
