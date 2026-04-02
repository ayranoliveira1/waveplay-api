import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { DatabaseModule } from '@/shared/database/database.module'
import { EnvModule } from '@/shared/env/env.module'
import { RedisModule } from '@/shared/redis/redis.module'
import { EmailModule } from '@/shared/email/email.module'
import { IdentityModule } from '@/modules/identity/infra/identity.module'

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 300,
        },
      ],
    }),
    EnvModule,
    DatabaseModule,
    RedisModule,
    EmailModule,
    IdentityModule,
  ],
})
export class AppModule {}
