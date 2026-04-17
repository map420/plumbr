import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: Implement QuickBooks OAuth2 redirect once Intuit credentials are available
  return NextResponse.json(
    { message: 'QuickBooks integration coming soon' },
    { status: 501 }
  )
}
