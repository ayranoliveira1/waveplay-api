import { Injectable, Logger } from '@nestjs/common'
import { google } from 'googleapis'
import * as nodemailer from 'nodemailer'

import { EmailSenderPort } from './email-sender.port'
import { EnvService } from '@/shared/env/env.service'

@Injectable()
export class NodemailerEmailSender implements EmailSenderPort {
  private readonly logger = new Logger(NodemailerEmailSender.name)

  constructor(private env: EnvService) {}

  async sendEmail(props: {
    to: string
    subject: string
    body: string
  }): Promise<void> {
    const CLIENT_ID = this.env.get('EMAIL_CLIENT_ID')
    const CLIENT_SECRET = this.env.get('EMAIL_CLIENT_SECRET')
    const REDIRECT_URI = this.env.get('EMAIL_REDIRECT_URI')
    const REFRESH_TOKEN = this.env.get('EMAIL_REFRESH_TOKEN')
    const USER = this.env.get('EMAIL_USER')

    const oAuth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
    )

    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })

    const accessToken = await oAuth2Client.getAccessToken()

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: USER,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token || '',
      },
    })

    await transporter.sendMail({
      from: `"WavePlay" <${USER}>`,
      to: props.to,
      subject: props.subject,
      html: props.body,
    })

    this.logger.log(`Email sent to ${props.to}: ${props.subject}`)
  }
}
