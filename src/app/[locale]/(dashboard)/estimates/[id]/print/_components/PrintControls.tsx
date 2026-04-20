'use client'

import { useTranslations } from 'next-intl'

export function PrintControls() {
  const t = useTranslations('print.button')
  return (
    <div className="no-print flex items-center gap-3 px-8 py-3" style={{ borderBottom: '1px solid var(--wp-border)', background: 'var(--wp-bg-muted)' }}>
      <button onClick={() => window.print()} className="btn-primary text-sm">{t('printPdf')}</button>
      <button onClick={() => history.back()} className="btn-secondary text-sm">{t('close')}</button>
    </div>
  )
}
