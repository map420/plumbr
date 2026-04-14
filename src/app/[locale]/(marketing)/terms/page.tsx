import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { Wrench } from 'lucide-react'

export default async function TermsPage() {
  const locale = await getLocale()
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1E3A5F] rounded-lg flex items-center justify-center">
              <Wrench size={14} className="text-white" />
            </div>
            <span className="text-xl font-extrabold text-[#1E3A5F]">WorkPilot</span>
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold text-[#1E3A5F] mb-2">Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: April 2025</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using WorkPilot, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">2. Description of Service</h2>
            <p>WorkPilot is a field service management platform for contractors. We provide tools for estimates, invoicing, job costing, scheduling, and field operations.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">3. Accounts and Billing</h2>
            <p>You are responsible for maintaining the security of your account. The 14-day free trial requires no payment information. After the trial, a $49/month subscription is required to continue using the service. You may cancel at any time.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">4. Acceptable Use</h2>
            <p>You agree not to misuse the service, attempt to access unauthorized data, or use the platform for any unlawful purpose.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">5. Limitation of Liability</h2>
            <p>WorkPilot is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">6. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">7. Contact</h2>
            <p>Questions about these terms? Email us at <a href="mailto:hello@mrlabs.io" className="text-[#F97316] hover:underline">hello@mrlabs.io</a>.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
