import { getTranslations } from 'next-intl/server'
import { CheckCircle2 } from 'lucide-react'
import { PLANS } from '@/lib/stripe'
import { CheckoutButton } from './_components/CheckoutButton'

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('nav')

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#1E3A5F]">WorkPilot Pro</h1>
          <p className="text-slate-500 mt-2">Everything you need to run your construction business</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-[#1E3A5F] p-8 text-white text-center">
            <div className="text-5xl font-bold">${PLANS.pro.price}</div>
            <div className="text-white/70 mt-1">per month</div>
            <div className="mt-3 inline-block bg-[#F97316] text-white text-xs font-semibold px-3 py-1 rounded-full">
              14-day free trial
            </div>
          </div>

          <div className="p-4 md:p-8">
            <ul className="space-y-3 mb-8">
              {PLANS.pro.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <CheckoutButton locale={locale} />

            <p className="text-center text-xs text-slate-400 mt-4">
              No credit card required for trial · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
