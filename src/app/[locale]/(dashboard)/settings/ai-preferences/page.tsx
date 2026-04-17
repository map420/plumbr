import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getAiPreferences } from '@/lib/actions/ai-preferences'
import { AiPreferencesClient } from './_components/AiPreferencesClient'

export default async function AiPreferencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const prefs = await getAiPreferences()

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <Link
        href={`/${locale}/settings`}
        className="inline-flex items-center gap-1 mb-4 text-sm font-medium"
        style={{ color: 'var(--wp-accent)' }}
      >
        <ChevronLeft size={16} /> Settings
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">AI Preferences</h1>
      <p className="text-sm text-slate-600 mb-6">
        Things the assistant has learned about how you work. Edit or remove anything that's wrong.
      </p>
      <AiPreferencesClient initial={prefs as any} />
    </div>
  )
}
