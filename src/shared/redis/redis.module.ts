import { Global, Logger, Module } from '@nestjs/common'
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
        const logger = new Logger('RedisModule')
        const client = new Redis(env.get('REDIS_URL'))

        client.on('connect', () => {
          logger.log('Redis connected successfully')
        })

        client.on('error', (err) => {
          logger.error('Redis connection error', err.message)
        })

        return client
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
