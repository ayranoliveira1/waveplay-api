export abstract class EmailSenderPort {
  abstract sendEmail(props: {
    to: string
    subject: string
    body: string
  }): Promise<void>
}
