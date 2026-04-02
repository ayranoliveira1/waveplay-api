import { Global, Module } from '@nestjs/common'

import { EmailSenderPort } from './email-sender.port'
import { NodemailerEmailSender } from './nodemailer-email-sender'

@Global()
@Module({
  providers: [
    {
      provide: EmailSenderPort,
      useClass: NodemailerEmailSender,
    },
  ],
  exports: [EmailSenderPort],
})
export class EmailModule {}
