export interface SmtpMessage {
  from: string
  to: string
  subject: string
  text: string
  html: string
}

export abstract class SmtpClient {
  abstract send(message: SmtpMessage): Promise<void>
}
