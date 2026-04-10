'use client'

import { useEffect } from 'react'

export function PrintButton() {
  useEffect(() => { setTimeout(() => window.print(), 400) }, [])
  return null
}
