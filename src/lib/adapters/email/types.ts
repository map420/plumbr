export interface EmailAdapter {
  send(opts: {
    to: string
    subject: string
    html: string
    from?: string
    replyTo?: string
    /** Transactional List-Unsubscribe URL (mailto: or https:). Optional. */
    listUnsubscribeUrl?: string
  }): Promise<{ id: string }>
}
