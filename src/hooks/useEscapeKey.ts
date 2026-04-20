import { useEffect } from 'react'

/**
 * Wire Escape key to a close handler. Active only while `enabled`.
 * Used by inline modals that need keyboard-accessible dismissal.
 */
export function useEscapeKey(enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled, onClose])
}
