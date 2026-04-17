import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { createPhoto } from '@/lib/actions/photos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const jobId = formData.get('jobId') as string | null
  const estimateId = formData.get('estimateId') as string | null
  const lineItemId = formData.get('lineItemId') as string | null
  const description = formData.get('description') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${userId}/${crypto.randomUUID()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filename)

  const photo = await createPhoto({
    jobId: jobId || undefined,
    estimateId: estimateId || undefined,
    lineItemId: lineItemId || undefined,
    description: description || undefined,
    url: urlData.publicUrl,
  })

  return NextResponse.json(photo)
}
