'use client'

import { useRef, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Trash2, Plus } from 'lucide-react'
import { updateProfile } from '@/lib/actions/profile'
import { formatEIN, formatPhone, formatZip, isValidEIN } from '@/lib/validation/settings'
import { FormRow } from '../FormRow'
import { SectionCard } from '../SectionCard'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'

export type CompanyFormState = {
  companyName: string
  phone: string
  email: string
  logoUrl: string
  businessTaxId: string
  licenseNumber: string
  licenseState: string
  businessAddress: string
  businessCity: string
  businessPostalCode: string
  defaultCurrency: string
  taxRate: string
  websiteUrl: string
  insuranceInfo: string
  socialLinks: Record<string, string>
}

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'MXN', label: 'MXN — Mexican Peso' },
  { code: 'BRL', label: 'BRL — Brazilian Real' },
  { code: 'COP', label: 'COP — Colombian Peso' },
  { code: 'ARS', label: 'ARS — Argentine Peso' },
]

const DEFAULT_SOCIALS = ['linkedin', 'facebook', 'instagram'] as const
const EXTRA_SOCIAL_OPTIONS = ['twitter', 'tiktok', 'youtube', 'yelp'] as const

export function CompanySection({
  initial,
  locale,
}: {
  initial: CompanyFormState
  locale: string
}) {
  const router = useRouter()
  const [form, setForm] = useState<CompanyFormState>(initial)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const es = locale === 'es'

  const isDirty = JSON.stringify(form) !== JSON.stringify(initial)
  useUnsavedChangesWarning(isDirty)
  const einInvalid = form.businessTaxId.length > 0 && !isValidEIN(form.businessTaxId)

  const update = <K extends keyof CompanyFormState>(key: K, value: CompanyFormState[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  async function handleLogoUpload(file: File) {
    setUploadError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/photos/upload?kind=logo', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }
      const { url } = await res.json()
      update('logoUrl', url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (einInvalid) return
    startTransition(async () => {
      await updateProfile({
        name: '',
        companyName: form.companyName,
        phone: form.phone,
        email: form.email || undefined,
        logoUrl: form.logoUrl,
        taxRate: form.taxRate,
        businessTaxId: form.businessTaxId,
        licenseNumber: form.licenseNumber,
        licenseState: form.licenseState,
        businessAddress: form.businessAddress,
        businessCity: form.businessCity,
        businessPostalCode: form.businessPostalCode,
        defaultCurrency: form.defaultCurrency,
        websiteUrl: form.websiteUrl,
        insuranceInfo: form.insuranceInfo,
        socialLinks: form.socialLinks,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    })
  }

  function handleCancel() {
    setForm(initial)
  }

  const showChip = form.businessCity.trim() && form.licenseState.trim()
  const extraSocials = Object.keys(form.socialLinks).filter(
    k => !DEFAULT_SOCIALS.includes(k as (typeof DEFAULT_SOCIALS)[number])
  )
  const availableExtras = EXTRA_SOCIAL_OPTIONS.filter(k => !extraSocials.includes(k))

  return (
    <form onSubmit={handleSave}>
      <SectionCard
        title="Company"
        subtitle={es ? 'Información que aparece en estimates, invoices y el portal del cliente' : 'Info shown on estimates, invoices and the client portal'}
        footer={
          <>
            {saved && (
              <span className="text-xs font-medium mr-2" style={{ color: 'var(--wp-success-v2)' }}>
                {es ? 'Guardado' : 'Saved'} ✓
              </span>
            )}
            <button
              type="button"
              onClick={handleCancel}
              disabled={!isDirty || isPending}
              className="btn-secondary btn-sm disabled:opacity-40"
            >
              {es ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!isDirty || isPending || einInvalid}
              className="btn-primary btn-sm disabled:opacity-40"
            >
              {isPending ? (es ? 'Guardando…' : 'Saving…') : (es ? 'Guardar cambios' : 'Save changes')}
            </button>
          </>
        }
      >
        {/* ── Identity ── */}
        <SubHeader>{es ? 'Identidad' : 'Identity'}</SubHeader>

        <FormRow label={es ? 'Logo' : 'Logo'}>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden"
              style={{ background: 'var(--wp-text)' }}
            >
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                initialsFrom(form.companyName || 'WP')
              )}
            </div>
            <div className="flex flex-col gap-1">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                className="hidden"
              />
              <div className="flex gap-2 items-center flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5"
                >
                  <Upload size={13} />
                  {uploading ? (es ? 'Subiendo…' : 'Uploading…') : (form.logoUrl ? (es ? 'Cambiar' : 'Replace') : (es ? 'Subir' : 'Upload new'))}
                </button>
                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={() => update('logoUrl', '')}
                    className="btn-secondary btn-sm inline-flex items-center gap-1.5"
                    style={{ color: 'var(--wp-error-v2)' }}
                  >
                    <Trash2 size={12} /> {es ? 'Quitar' : 'Remove'}
                  </button>
                )}
              </div>
              <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>
                {es ? 'PNG, SVG o JPG · máx 2 MB' : 'PNG, SVG or JPG · max 2 MB'}
              </span>
              {uploadError && <span className="text-xs" style={{ color: 'var(--wp-error-v2)' }}>{uploadError}</span>}
            </div>
          </div>
        </FormRow>

        <FormRow
          label={es ? 'Nombre comercial' : 'Business name'}
          subtitle={es ? 'Cómo aparece en documentos' : 'How it appears on documents'}
        >
          <input
            className="input w-full"
            value={form.companyName}
            onChange={e => update('companyName', e.target.value)}
            placeholder="WorkPilot Plumbing LLC"
          />
        </FormRow>

        <FormRow
          label="Business Tax ID · EIN"
          subtitle={einInvalid ? (es ? 'Formato esperado: 12-3456789' : 'Expected format: 12-3456789') : undefined}
        >
          <input
            className="input w-full"
            value={form.businessTaxId}
            onChange={e => update('businessTaxId', formatEIN(e.target.value))}
            placeholder="12-3456789"
            style={einInvalid ? { borderColor: 'var(--wp-error-v2)' } : undefined}
          />
        </FormRow>

        {/* ── License ── */}
        <SubHeader>{es ? 'Licencia' : 'License'}</SubHeader>

        <FormRow
          label={es ? 'Número' : 'Number'}
          subtitle={es ? 'License del plomero (opcional)' : 'Plumber license number (optional)'}
        >
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={form.licenseNumber}
              onChange={e => update('licenseNumber', e.target.value)}
              placeholder="C-36-982"
            />
            <input
              className="input w-24"
              value={form.licenseState}
              onChange={e => update('licenseState', e.target.value.toUpperCase())}
              placeholder="NY"
              maxLength={4}
            />
          </div>
        </FormRow>

        {/* ── Contact ── */}
        <SubHeader>{es ? 'Contacto' : 'Contact'}</SubHeader>

        <FormRow label={es ? 'Teléfono y email' : 'Phone & email'}>
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              type="tel"
              className="input flex-1"
              value={form.phone}
              onChange={e => update('phone', formatPhone(e.target.value))}
              placeholder="(555) 100-2000"
            />
            <input
              type="email"
              className="input flex-1"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="ops@workpilot.com"
            />
          </div>
        </FormRow>

        {/* ── Address ── */}
        <SubHeader>{es ? 'Dirección' : 'Address'}</SubHeader>

        <FormRow label={es ? 'Calle, ciudad, ZIP' : 'Street, city, ZIP'}>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_100px] gap-2">
            <input
              className="input"
              value={form.businessAddress}
              onChange={e => update('businessAddress', e.target.value)}
              placeholder="847 Metropolitan Ave"
            />
            <input
              className="input"
              value={form.businessCity}
              onChange={e => update('businessCity', e.target.value)}
              placeholder="Brooklyn"
            />
            <input
              className="input"
              value={form.businessPostalCode}
              onChange={e => update('businessPostalCode', formatZip(e.target.value))}
              placeholder="11211"
              maxLength={10}
            />
          </div>
        </FormRow>

        {/* ── Commerce ── */}
        <SubHeader>{es ? 'Comercio' : 'Commerce'}</SubHeader>

        <FormRow label={es ? 'Moneda por defecto' : 'Default currency'}>
          <select
            className="input w-full"
            value={form.defaultCurrency}
            onChange={e => update('defaultCurrency', e.target.value)}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </FormRow>

        <FormRow
          label={es ? 'Tax rate por defecto' : 'Default tax rate'}
          subtitle={es ? 'Se aplica al crear nuevos estimates' : 'Applied to new estimates automatically'}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                className="input w-20 text-right"
                value={form.taxRate}
                onChange={e => update('taxRate', e.target.value)}
                placeholder="8"
              />
              <span className="text-sm" style={{ color: 'var(--wp-text-2)' }}>%</span>
            </div>
            {showChip && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)' }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--wp-success-v2)' }} />
                {form.businessCity}, {form.licenseState}
              </span>
            )}
          </div>
        </FormRow>

        {/* ── Web presence ── */}
        <SubHeader>{es ? 'Presencia web' : 'Web presence'}</SubHeader>

        <FormRow
          label="Website"
          subtitle={es ? 'Se muestra en el portal del cliente' : 'Shown on the client portal'}
        >
          <input
            type="url"
            className="input w-full"
            value={form.websiteUrl}
            onChange={e => update('websiteUrl', e.target.value)}
            placeholder="https://workpilot.com"
          />
        </FormRow>

        <FormRow
          label={es ? 'Redes sociales' : 'Social links'}
          subtitle={es ? 'Opcional — aparecen en documentos enviados' : 'Optional — shown on sent documents'}
          align="start"
        >
          <div className="space-y-2">
            {DEFAULT_SOCIALS.map(key => (
              <SocialInput
                key={key}
                platform={key}
                value={form.socialLinks[key] ?? ''}
                onChange={v => update('socialLinks', { ...form.socialLinks, [key]: v })}
              />
            ))}
            {extraSocials.map(key => (
              <SocialInput
                key={key}
                platform={key}
                value={form.socialLinks[key] ?? ''}
                onChange={v => update('socialLinks', { ...form.socialLinks, [key]: v })}
                onRemove={() => {
                  const { [key]: _, ...rest } = form.socialLinks
                  void _
                  update('socialLinks', rest)
                }}
              />
            ))}
            {availableExtras.length > 0 && (
              <details>
                <summary className="text-xs cursor-pointer inline-flex items-center gap-1" style={{ color: 'var(--wp-text-3)' }}>
                  <Plus size={11} /> {es ? 'Agregar plataforma' : 'Add platform'}
                </summary>
                <div className="mt-1.5 flex gap-1.5 flex-wrap">
                  {availableExtras.map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => update('socialLinks', { ...form.socialLinks, [k]: '' })}
                      className="text-xs px-2 py-1 rounded capitalize"
                      style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-2)' }}
                    >
                      + {k}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
        </FormRow>

        <FormRow
          label={es ? 'Seguro' : 'Insurance'}
          subtitle={es ? 'Póliza y coberturas' : 'Carrier and coverage info'}
          align="start"
        >
          <textarea
            rows={2}
            className="input w-full resize-none"
            value={form.insuranceInfo}
            onChange={e => update('insuranceInfo', e.target.value)}
            placeholder={es ? 'Ej. Hartford — GL $1M, WC incluido' : 'e.g. Hartford — GL $1M, WC included'}
          />
        </FormRow>
      </SectionCard>
    </form>
  )
}

function SubHeader({ children }: { children: ReactNode }) {
  return (
    <div className="pt-4 pb-1.5">
      <div
        className="text-[10px] font-semibold tracking-wider uppercase"
        style={{ color: 'var(--wp-text-3)' }}
      >
        {children}
      </div>
    </div>
  )
}

function SocialInput({
  platform, value, onChange, onRemove,
}: {
  platform: string
  value: string
  onChange: (v: string) => void
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs capitalize w-20 shrink-0" style={{ color: 'var(--wp-text-3)' }}>{platform}</span>
      <input
        type="url"
        className="input flex-1"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`https://${platform}.com/yourcompany`}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded"
          style={{ color: 'var(--wp-text-3)' }}
          aria-label="Remove"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

function initialsFrom(s: string) {
  return s.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || 'WP'
}
