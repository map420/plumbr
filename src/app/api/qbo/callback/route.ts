import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: Handle QuickBooks OAuth2 callback once Intuit credentials are available
  return NextResponse.json(
    { message: 'QuickBooks integration coming soon' },
    { status: 501 }
  )
}
