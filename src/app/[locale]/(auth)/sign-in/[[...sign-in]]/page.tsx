import { SignIn } from '@clerk/nextjs'
import { getTranslations } from 'next-intl/server'

export default async function SignInPage() {
  const t = await getTranslations('auth.signIn')
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E3A5F]">{t('title')}</h1>
          <p className="text-slate-500 mt-1">{t('subtitle')}</p>
        </div>
        <SignIn />
      </div>
    </div>
  )
}
