import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { EnvService } from '@/shared/env/env.service'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { Logger } from '@nestjs/common'

async function bootstrap() {
  const logger = new Logger('Main')

  const app = await NestFactory.create(AppModule)
  const env = app.get(EnvService)

  app.use(helmet())
  app.use(cookieParser())
  app.useGlobalFilters(new AllExceptionsFilter())
  app.enableCors({
    origin: [env.get('CORS_ORIGIN')],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform'],
  })

  const port = env.get('PORT')
  await app.listen(port)
  logger.log(`Application is running on: http://localhost:${port}`)
}
bootstrap()
