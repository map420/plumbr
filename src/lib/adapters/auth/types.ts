export interface AuthAdapter {
  getUserId(): Promise<string | null>
}
