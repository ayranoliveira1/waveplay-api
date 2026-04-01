import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { DatabaseModule } from '@/shared/database/database.module'
import { EnvModule } from '@/shared/env/env.module'

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
  ],
})
export class AppModule {}
