export interface EmailAdapter {
  send(opts: {
    to: string
    subject: string
    html: string
    from?: string
    replyTo?: string
  }): Promise<{ id: string }>
}
