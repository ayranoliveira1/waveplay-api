import 'dotenv/config'
import { hash } from 'argon2'
import { PrismaClient, Role } from '../src/shared/database/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const plans = [
    {
      name: 'Básico',
      slug: 'basico',
      priceCents: 0,
      maxProfiles: 1,
      maxStreams: 1,
      description: '1 perfil, 1 tela',
    },
    {
      name: 'Padrão',
      slug: 'padrao',
      priceCents: 1990,
      maxProfiles: 3,
      maxStreams: 2,
      description: '3 perfis, 2 telas simultâneas',
    },
    {
      name: 'Premium',
      slug: 'premium',
      priceCents: 3990,
      maxProfiles: 5,
      maxStreams: 4,
      description: '5 perfis, 4 telas simultâneas',
    },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        priceCents: plan.priceCents,
        maxProfiles: plan.maxProfiles,
        maxStreams: plan.maxStreams,
        description: plan.description,
      },
      create: plan,
    })
  }

  console.log('Seed completed: 3 plans created/updated')

  // Admin user
  const adminPasswordHash = await hash('Admin@123', {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    type: 2, // argon2id
  })

  await prisma.user.upsert({
    where: { email: 'admin@waveplay.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@waveplay.com',
      passwordHash: adminPasswordHash,
      role: Role.admin,
    },
  })

  console.log('Seed completed: admin user created')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
