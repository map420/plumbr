'use client'

import { useRef, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/lib/actions/profile'
import { Toggle } from '@/components/ui'
import { FormRow } from '../FormRow'
import { SectionCard } from '../SectionCard'

export type TemplatesFormState = {
  paymentTerms: string
  documentFooter: string
  showCredentialsOnDocs: boolean
}

export function TemplatesSection({
  initial,
  locale,
  baseProfile,
  hasCredentials,
}: {
  initial: TemplatesFormState
  locale: string
  baseProfile: { name: string; companyName: string; phone: string }
  hasCredentials: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const es = locale === 'es'
  const isDirty = JSON.stringify(form) !== JSON.stringify(initial)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 22
    const maxHeight = lineHeight * 8 + 16
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
  }, [form.documentFooter])

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await updateProfile({ ...baseProfile, ...form })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSave}>
      <SectionCard
        title={es ? 'Plantillas' : 'Templates'}
        subtitle={es ? 'Configuración por defecto para estimates e invoices' : 'Defaults for estimates and invoices'}
        footer={
          <>
            {saved && <span className="text-xs font-medium mr-2" style={{ color: 'var(--wp-success-v2)' }}>{es ? 'Guardado ✓' : 'Saved ✓'}</span>}
            <button type="submit" disabled={!isDirty || isPending} className="btn-primary btn-sm disabled:opacity-40">
              {isPending ? (es ? 'Guardando…' : 'Saving…') : (es ? 'Guardar cambios' : 'Save changes')}
            </button>
          </>
        }
      >
        <FormRow label={es ? 'Términos de pago' : 'Payment terms'}>
          <select
            value={form.paymentTerms}
            onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}
            className="input w-full max-w-xs"
          >
            <option value="due_on_receipt">{es ? 'Pago inmediato' : 'Due on receipt'}</option>
            <option value="net15">Net 15</option>
            <option value="net30">Net 30</option>
            <option value="net45">Net 45</option>
          </select>
        </FormRow>
        <FormRow
          label={es ? 'Pie de documento' : 'Document footer'}
          subtitle={es ? 'Aparece al final de estimates e invoices' : 'Appears at the bottom of estimates & invoices'}
          align="start"
        >
          <textarea
            ref={textareaRef}
            rows={3}
            value={form.documentFooter}
            onChange={e => setForm(f => ({ ...f, documentFooter: e.target.value }))}
            className="input w-full resize-none overflow-hidden"
            placeholder={es ? 'Ej. Pago en 30 días. Gracias.' : 'e.g. Payment due within 30 days. Thank you.'}
          />
        </FormRow>
        {hasCredentials && (
          <FormRow
            label={es ? 'Mostrar credenciales' : 'Show credentials'}
            subtitle={es ? 'License e información de seguro en estimates/invoices' : 'License and insurance info on sent documents'}
          >
            <Toggle
              checked={form.showCredentialsOnDocs}
              onChange={v => setForm(p => ({ ...p, showCredentialsOnDocs: v }))}
              aria-label="Show credentials on documents"
            />
          </FormRow>
        )}
        {!hasCredentials && (
          <div className="py-4 text-xs" style={{ color: 'var(--wp-text-3)' }}>
            {es
              ? 'Configura License o Insurance en Company para poder mostrarlos en documentos.'
              : 'Set License or Insurance in Company to enable showing them on documents.'}
          </div>
        )}
      </SectionCard>
    </form>
  )
}
