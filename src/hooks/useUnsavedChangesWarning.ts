'use client'

import { useEffect } from 'react'

/**
 * Warn con el diálogo nativo del navegador si el usuario intenta salir de la página
 * con cambios sin guardar. Se activa sólo cuando `isDirty` es true.
 *
 * No puede evitar la navegación dentro del app (Next.js soft-nav) sin APIs extra;
 * cubre sólo close tab, reload, y cambios a otra URL externa.
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Chrome requiere setear returnValue para mostrar el prompt
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
