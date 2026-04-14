import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { Wrench } from 'lucide-react'

export default async function PrivacyPage() {
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
        <h1 className="text-4xl font-extrabold text-[#1E3A5F] mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: April 2025</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This includes name, email address, company name, and payment information (processed securely via Stripe).</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send transactional and promotional communications, and comply with legal obligations.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">3. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with trusted third-party service providers (Clerk for authentication, Resend for email, Stripe for payments, Supabase for database) solely to operate our service.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">4. Data Retention</h2>
            <p>We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">5. Security</h2>
            <p>We implement industry-standard security measures to protect your data. All data is encrypted in transit and at rest.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-3">6. Contact</h2>
            <p>For privacy-related questions, contact us at <a href="mailto:hello@mrlabs.io" className="text-[#F97316] hover:underline">hello@mrlabs.io</a>.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
