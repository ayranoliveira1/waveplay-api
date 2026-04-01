import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import helmet from 'helmet'
import { Logger } from '@nestjs/common'

async function bootstrap() {
  const logger = new Logger('Main')

  const app = await NestFactory.create(AppModule)

  app.use(helmet())
  app.useGlobalFilters(new AllExceptionsFilter())
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform'],
  })

  const port = process.env.PORT ?? 3333
  await app.listen(port)
  logger.log(`Application is running on: http://localhost:${port}`)
}
bootstrap()
