import { Global, Module } from '@nestjs/common'
import { EnvService } from '@/shared/env/env.service'
import Redis from 'ioredis'

export const REDIS_CLIENT = 'REDIS_CLIENT'

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [EnvService],
      useFactory: (env: EnvService) => {
        return new Redis(env.get('REDIS_URL'))
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
