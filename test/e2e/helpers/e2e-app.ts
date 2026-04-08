import { Test } from '@nestjs/testing'
import { ThrottlerStorage } from '@nestjs/throttler'
import { AppModule } from '@/app.module'
import { EmailSenderPort } from '@/shared/email/email-sender.port'
import { FakeEmailSender } from 'test/ports/fake-email-sender'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

interface E2EAppOptions {
  enableThrottling?: boolean
}

const noOpThrottlerStorage = {
  storage: new Map(),
  increment: async () => ({
    totalHits: 0,
    timeToExpire: 0,
    isBlocked: false,
    timeToBlockExpire: 0,
  }),
}

export async function createE2EApp(options: E2EAppOptions = {}) {
  const emailSpy = new FakeEmailSender()

  let builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailSenderPort)
    .useValue(emailSpy)

  if (!options.enableThrottling) {
    builder = builder
      .overrideProvider(ThrottlerStorage)
      .useValue(noOpThrottlerStorage)
  }

  const moduleRef = await builder.compile()

  const app = moduleRef.createNestApplication()

  app.use(helmet())
  app.use(cookieParser())
  app.useGlobalFilters(new AllExceptionsFilter())
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform'],
  })

  await app.init()

  return { app, emailSpy }
}

export type E2EApp = Awaited<ReturnType<typeof createE2EApp>>
