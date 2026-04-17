'use client'

import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { deletePhoto } from '@/lib/actions/photos'

type Photo = { id: string; url: string; description: string | null; thumbnailUrl: string | null }

export function PhotoGallery({ photos, canDelete = false }: { photos: Photo[]; canDelete?: boolean }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deletePhoto(id)
    setDeletingId(null)
  }

  if (photos.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {photos.map(photo => (
          <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-slate-100 aspect-square">
            <img
              src={photo.thumbnailUrl || photo.url}
              alt={photo.description || 'Photo'}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightboxUrl(photo.url)}
            />
            {canDelete && (
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deletingId === photo.id}
                className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxUrl(null)}>
            <X size={24} />
          </button>
          <img src={lightboxUrl} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  )
}
