import { PrismaClient } from '@/shared/database/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Pool } from 'pg'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = process.env['DATABASE_URL'] ?? ''
    const url = new URL(databaseUrl)
    const schema = url.searchParams.get('schema')

    if (schema) {
      url.searchParams.delete('schema')
    }

    const pool = new Pool({
      connectionString: url.toString(),
      ...(schema ? { options: `-c search_path="${schema}"` } : {}),
    })

    const adapter = new PrismaPg(pool, { schema: schema ?? undefined })
    super({ adapter })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
