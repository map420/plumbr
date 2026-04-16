import { getAiPreferences } from '@/lib/actions/ai-preferences'
import { AiPreferencesClient } from './_components/AiPreferencesClient'

export default async function AiPreferencesPage() {
  const prefs = await getAiPreferences()
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">AI Preferences</h1>
      <p className="text-sm text-slate-600 mb-6">
        Things the assistant has learned about how you work. Edit or remove anything that's wrong.
      </p>
      <AiPreferencesClient initial={prefs as any} />
    </div>
  )
}
