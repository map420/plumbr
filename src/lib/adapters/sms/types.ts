export interface SmsAdapter {
  sendSms(to: string, body: string): Promise<{ sid: string }>
}
