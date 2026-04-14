import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { getLocale } from 'next-intl/server'
import {
  ArrowRight, FileText, BarChart2, Calendar,
  Smartphone, Users, Receipt, Mail, CreditCard, Shield,
} from 'lucide-react'
import { siteConfig } from '@/lib/config'
import { Navbar } from '@/app/[locale]/(marketing)/_components/Navbar'
import { Footer } from '@/app/[locale]/(marketing)/_components/Footer'

export const metadata: Metadata = {
  title: 'Features — WorkPilot Contractor Software',
  description:
    'Explore every feature in WorkPilot: estimates, invoicing, job costing, crew scheduling, mobile field app, client management and more. Built for contractors under $5M.',
  alternates: { canonical: `${siteConfig.url}/en/features` },
  keywords: [
    'contractor estimate software features',
    'contractor invoicing features',
    'job costing software features',
    'crew scheduling app',
    'contractor management features',
  ],
}

const FEATURES = [
  {
    icon: FileText,
    title: 'Estimates & Templates',
    badge: 'Win more jobs',
    desc: 'Build professional estimates in under 3 minutes using your own material and labor templates. No more starting from scratch on every job.',
    bullets: [
      'Reusable cost templates per trade',
      'Itemized material + labor breakdowns',
      'Send PDF estimates to clients instantly',
      'Client e-signature ready',
    ],
  },
  {
    icon: Receipt,
    title: '1-Click Invoicing',
    badge: 'Get paid faster',
    desc: 'Convert any approved estimate to a professional invoice in one click. No re-entering data. No double work.',
    bullets: [
      'Estimate → Invoice in 1 click',
      'Professional PDF invoices',
      'Email delivery to clients',
      'Track paid / pending / overdue',
    ],
  },
  {
    icon: BarChart2,
    title: 'Real-Time Job Costing',
    badge: 'Know your margins',
    desc: "Know your profit margin before the job ends. Track budgeted vs actual costs across labor, materials and subcontractors in real time.",
    bullets: [
      'Budget vs actual tracking per job',
      'Labor cost per technician',
      'Material cost tracking',
      'Profit margin visibility',
    ],
  },
  {
    icon: Calendar,
    title: 'Visual Crew Scheduling',
    badge: 'No more text chaos',
    desc: 'See every crew member and every job in a single weekly calendar. Assign, move and reschedule with drag and drop.',
    bullets: [
      'Weekly drag-and-drop calendar',
      'Assign techs to jobs',
      'Conflict detection',
      'Mobile-accessible for crews',
    ],
  },
  {
    icon: Smartphone,
    title: 'Mobile Field App',
    badge: 'Works offline',
    desc: 'Your techs have everything they need on-site: job details, checklists, photo upload and hour logging — even without cell signal.',
    bullets: [
      'Photo documentation per job',
      'Task checklists',
      'Hour logging',
      'Works offline (PWA)',
    ],
  },
  {
    icon: Users,
    title: 'Client Management',
    badge: 'All your clients',
    desc: 'Every client in one place with their full job history, estimates, invoices and contact info. No more digging through emails.',
    bullets: [
      'Full client profile',
      'Job history per client',
      'All estimates and invoices',
      'Quick contact access',
    ],
  },
  {
    icon: Mail,
    title: 'Email Automation',
    badge: 'Look professional',
    desc: 'Send branded estimates, invoices and follow-ups directly from WorkPilot. Clients receive professional emails, not attachments.',
    bullets: [
      'Branded estimate emails',
      'Invoice delivery',
      'Client portal link',
      'Read receipts',
    ],
  },
  {
    icon: CreditCard,
    title: 'Expense Tracking',
    badge: 'Every dollar counted',
    desc: 'Log every job expense as you go — materials bought, subcontractors paid, equipment rented. Know your true cost.',
    bullets: [
      'Expense logging per job',
      'Material vs labor split',
      'Subcontractor costs',
      'Expense reports',
    ],
  },
  {
    icon: Shield,
    title: 'Client Portal',
    badge: 'Coming soon',
    desc: 'Give clients a private link to view job progress, approve change orders and pay invoices online — without needing an account.',
    bullets: [
      'Shareable job progress link',
      'Change order approvals',
      'Online invoice payment',
      'No client login required',
    ],
  },
]

export default async function FeaturesPage() {
  const locale = await getLocale()
  const { userId } = await auth()
  const isSignedIn = !!userId

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar locale={locale} isSignedIn={isSignedIn} />

      <main className="pt-16">
        {/* Hero */}
        <section className="py-20 bg-[#F8FAFC]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F97316] mb-3 block" style={{ letterSpacing: '0.08em' }}>
              Features
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#1E3A5F] tracking-tight mb-4">
              Everything you need.<br />Nothing you don&apos;t.
            </h1>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              WorkPilot is built specifically for contractors under $5M — not adapted from enterprise software.
            </p>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES.map(feat => {
                const Icon = feat.icon
                return (
                  <div
                    key={feat.title}
                    className="group bg-white rounded-2xl p-7 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                    style={{ borderTop: '3px solid #F97316' }}
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-11 h-11 bg-[#F97316]/10 rounded-xl flex items-center justify-center">
                        <Icon size={22} className="text-[#F97316]" />
                      </div>
                      <span className="text-xs font-semibold text-[#F97316] bg-[#F97316]/10 px-2.5 py-1 rounded-full">
                        {feat.badge}
                      </span>
                    </div>
                    <h2 className="font-bold text-[#1E3A5F] text-lg mb-2">{feat.title}</h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">{feat.desc}</p>
                    <ul className="space-y-1.5">
                      {feat.bullets.map(b => (
                        <li key={b} className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          className="py-20"
          style={{ background: 'linear-gradient(135deg, #0F2440 0%, #1E3A5F 100%)' }}
        >
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Try every feature free for 14 days
            </h2>
            <p className="text-white/50 mb-8">No credit card. No setup fees. No contracts.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={`/${locale}/sign-up`}
                className="inline-flex items-center gap-2 bg-[#F97316] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#ea6c0a] transition-all hover:scale-[1.02] shadow-lg shadow-orange-500/25"
              >
                Start free trial <ArrowRight size={18} />
              </Link>
              <Link
                href={`/${locale}/pricing`}
                className="text-white/60 hover:text-white text-sm font-medium transition-colors"
              >
                View pricing →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  )
}
