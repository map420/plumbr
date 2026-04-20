import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { createPhoto } from '@/lib/actions/photos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LOGO_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'])
const LOGO_MAX_BYTES = 2 * 1024 * 1024

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') === 'logo' ? 'logo' : 'photo'

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (kind === 'logo') {
    if (!LOGO_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PNG, JPG, SVG' }, { status: 400 })
    }
    if (file.size > LOGO_MAX_BYTES) {
      return NextResponse.json({ error: 'File too large. Max 2 MB.' }, { status: 400 })
    }
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const folder = kind === 'logo' ? 'logos' : 'photos'
  const filename = `${folder}/${userId}/${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filename)

  if (kind === 'logo') {
    return NextResponse.json({ url: urlData.publicUrl })
  }

  const jobId = formData.get('jobId') as string | null
  const estimateId = formData.get('estimateId') as string | null
  const lineItemId = formData.get('lineItemId') as string | null
  const description = formData.get('description') as string | null

  const photo = await createPhoto({
    jobId: jobId || undefined,
    estimateId: estimateId || undefined,
    lineItemId: lineItemId || undefined,
    description: description || undefined,
    url: urlData.publicUrl,
  })

  return NextResponse.json(photo)
}
