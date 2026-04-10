export interface EmailAdapter {
  send(opts: {
    to: string
    subject: string
    html: string
    from?: string
  }): Promise<{ id: string }>
}
