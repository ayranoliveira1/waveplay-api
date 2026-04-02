import { EmailSenderPort } from '@/shared/email/email-sender.port'

export class FakeEmailSender implements EmailSenderPort {
  public emailsSent: Array<{ to: string; subject: string; body: string }> = []

  async sendEmail(props: {
    to: string
    subject: string
    body: string
  }): Promise<void> {
    this.emailsSent.push(props)
  }
}
