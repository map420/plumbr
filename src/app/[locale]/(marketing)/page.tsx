import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'

const plans = [
  { key: 'starter', price: 99, featured: false },
  { key: 'growth', price: 199, featured: true },
  { key: 'pro', price: 299, featured: false },
] as const

export default async function LandingPage() {
  const t = await getTranslations('marketing')
  const locale = await getLocale()
  const features = t.raw('features.items') as string[]

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-[#1E3A5F]">Plumbr</span>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/sign-in`} className="text-sm text-slate-600 hover:text-slate-900">
              {t('nav.signIn')}
            </Link>
            <Link href={`/${locale}/sign-up`} className="btn-primary text-sm">
              {t('nav.startTrial')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          {t('hero.badge')}
        </div>
        <h1 className="text-5xl font-bold text-[#1E3A5F] leading-tight mb-6">
          {t('hero.title')}<br />
          <span className="text-[#F97316]">{t('hero.titleAccent')}</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          {t('hero.subtitle')}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href={`/${locale}/sign-up`} className="btn-primary flex items-center gap-2 text-base px-6 py-3">
            {t('hero.cta')} <ArrowRight size={18} />
          </Link>
          <span className="text-sm text-slate-400">{t('hero.noCreditCard')}</span>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1E3A5F] text-center mb-12">
            {t('features.title')}
          </h2>
          <div className="max-w-xl mx-auto space-y-4">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-3">
                <CheckCircle size={20} className="text-[#F97316] mt-0.5 shrink-0" />
                <span className="text-slate-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1E3A5F] text-center mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-center text-slate-500 mb-12">{t('pricing.subtitle')}</p>
          <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map(({ key, price, featured }) => (
              <div key={key} className={`rounded-xl border p-6 ${featured ? 'border-[#F97316] bg-orange-50 shadow-md' : 'border-slate-200 bg-white'}`}>
                {featured && (
                  <div className="text-xs font-bold text-[#F97316] uppercase tracking-wider mb-3">
                    {t('pricing.mostPopular')}
                  </div>
                )}
                <div className="text-lg font-bold text-slate-900 mb-1">
                  {t(`pricing.plans.${key}.name`)}
                </div>
                <div className="text-3xl font-bold text-[#1E3A5F] mb-1">
                  ${price}<span className="text-base font-normal text-slate-400">{t('pricing.perMonth')}</span>
                </div>
                <div className="text-sm text-slate-500 mb-6">
                  {t(`pricing.plans.${key}.seats`)}
                </div>
                <Link
                  href={`/${locale}/sign-up`}
                  className={`block text-center text-sm font-semibold py-2 rounded-lg transition-colors ${featured ? 'bg-[#F97316] text-white hover:bg-orange-600' : 'bg-[#1E3A5F] text-white hover:bg-blue-900'}`}
                >
                  {t('pricing.cta')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-slate-400">
          <span>{t('footer.copy')}</span>
          <span>{t('footer.tagline')}</span>
        </div>
      </footer>
    </div>
  )
}
