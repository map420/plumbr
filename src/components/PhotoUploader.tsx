'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2 } from 'lucide-react'

type Props = {
  jobId?: string
  estimateId?: string
  lineItemId?: string
  maxPhotos?: number
  onUploaded?: (photo: { id: string; url: string; description: string | null }) => void
}

export function PhotoUploader({ jobId, estimateId, lineItemId, maxPhotos = 4, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)

    for (const file of Array.from(files).slice(0, maxPhotos)) {
      const formData = new FormData()
      formData.append('file', file)
      if (jobId) formData.append('jobId', jobId)
      if (estimateId) formData.append('estimateId', estimateId)
      if (lineItemId) formData.append('lineItemId', lineItemId)

      try {
        const res = await fetch('/api/photos/upload', { method: 'POST', body: formData })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Upload failed')
        }
        const photo = await res.json()
        onUploaded?.(photo)
      } catch (err: any) {
        setError(err.message)
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={e => handleUpload(e.target.files)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
      >
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
        {uploading ? 'Uploading...' : 'Upload Photos'}
      </button>
      {error && (
        <span className="text-xs text-red-500 flex items-center gap-1">
          <X size={12} /> {error}
        </span>
      )}
    </div>
  )
}
