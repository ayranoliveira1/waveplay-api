import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { DatabaseModule } from '@/shared/database/database.module'
import { EnvModule } from '@/shared/env/env.module'
import { RedisModule } from '@/shared/redis/redis.module'
import { EmailModule } from '@/shared/email/email.module'
import { IdentityModule } from '@/modules/identity/infra/identity.module'
import { ProfileModule } from '@/modules/profile/infra/profile.module'
import { SubscriptionModule } from '@/modules/subscription/infra/subscription.module'
import { CatalogModule } from '@/modules/catalog/infra/catalog.module'
import { LibraryModule } from '@/modules/library/infra/library.module'
import { PlaybackModule } from '@/modules/playback/infra/playback.module'

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
    ProfileModule,
    SubscriptionModule,
    CatalogModule,
    LibraryModule,
    PlaybackModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
