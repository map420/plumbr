export type Trade = {
  slug: string
  name: string
  namePlural: string
  icon: string
  headline: string
  subheadline: string
  pains: string[]
  benefits: string[]
  testimonial: { quote: string; name: string; company: string; location: string; initials: string }
  keywords: string[]
  metaTitle: string
  metaDescription: string
}

export const TRADES: Record<string, Trade> = {
  plumbers: {
    slug: 'plumbers',
    name: 'Plumber',
    namePlural: 'Plumbers',
    icon: '🔧',
    headline: 'Plumbing Business Software That Actually Works in the Field',
    subheadline:
      'Stop writing estimates on paper. WorkPilot helps plumbing contractors quote jobs, send invoices and track every job cost — from your phone.',
    pains: [
      'Spend hours rewriting the same estimate as a quote, then a contract, then an invoice',
      'No idea which jobs made money until weeks after the job ended',
      'Crew coordination by text — jobs fall through the cracks',
      'QuickBooks alone doesn\'t track job-level costs',
    ],
    benefits: [
      'Build a plumbing estimate in under 3 minutes with material + labor templates',
      'Convert estimate to invoice in 1 click — no double entry',
      'Track real-time job costing: parts, labor, subcontractors',
      'Assign crews to jobs visually — know who\'s where every day',
      'Techs submit photos and checklists from the field app',
    ],
    testimonial: {
      quote:
        'I run a 6-person plumbing crew. Before WorkPilot I had no idea which jobs were profitable. Now I know before I even finish the punch list.',
      name: 'Carlos M.',
      company: 'Rivera Plumbing Co.',
      location: 'Austin, TX',
      initials: 'CM',
    },
    keywords: [
      'plumbing business software',
      'plumbing contractor app',
      'plumbing estimate software',
      'plumbing invoice app',
      'plumbing job management',
      'software for plumbers',
    ],
    metaTitle: 'WorkPilot for Plumbers — Estimates, Invoices & Job Costing',
    metaDescription:
      'Plumbing business software built for field crews. Estimate faster, invoice in 1 click, and track job costs in real time. Try WorkPilot free for 14 days.',
  },

  electricians: {
    slug: 'electricians',
    name: 'Electrician',
    namePlural: 'Electricians',
    icon: '⚡',
    headline: 'Electrical Contractor Software for Crews That Stay Busy',
    subheadline:
      'Manage estimates, invoices and crew scheduling for your electrical business — all from one app built for contractors.',
    pains: [
      'Material cost changes between estimate and job completion eat into margins',
      'Juggling permits, schedules and invoices across multiple jobs at once',
      'Customers expect fast digital invoices but you\'re still using paper',
      'Hard to track which technician is on which job',
    ],
    benefits: [
      'Electrical estimate templates with material & labor line items',
      'Real-time job costing tracks budget vs actual as you go',
      'Send professional invoices to clients in seconds',
      'Schedule techs visually across all active jobs',
      'Field app lets techs log hours and upload job photos',
    ],
    testimonial: {
      quote:
        'WorkPilot cut my invoicing time from 2 hours to 10 minutes. My clients actually pay faster because everything looks professional.',
      name: 'James T.',
      company: 'Torres Electric',
      location: 'Houston, TX',
      initials: 'JT',
    },
    keywords: [
      'electrical contractor software',
      'electrician business app',
      'electrical estimate software',
      'electrician invoice app',
      'electrical job management software',
    ],
    metaTitle: 'WorkPilot for Electricians — Contractor Management Software',
    metaDescription:
      'Electrical contractor software for estimates, invoicing and crew scheduling. Know your job costs in real time. Start your free 14-day trial today.',
  },

  roofers: {
    slug: 'roofers',
    name: 'Roofer',
    namePlural: 'Roofers',
    icon: '🏚️',
    headline: 'Roofing Contractor Software to Win More Jobs and Lose No Money',
    subheadline:
      'From roof estimate to final invoice, WorkPilot keeps every roofing job organized so you know exactly what you\'re making.',
    pains: [
      'Material costs fluctuate and paper estimates don\'t update when they change',
      'Storm season means 30+ jobs — hard to track each one separately',
      'Customers request estimates fast; slow turnaround loses the job',
      'Insurance jobs need detailed documentation that takes forever to compile',
    ],
    benefits: [
      'Fast roofing estimates with square, pitch and material templates',
      'Track every job\'s budget vs actual in real time',
      'Send professional estimate PDFs same day — win more jobs',
      'Photo documentation from the field app for insurance claims',
      'Manage multiple crews across multiple job sites simultaneously',
    ],
    testimonial: {
      quote:
        'Storm season I have 40 jobs going at once. WorkPilot is the only reason I\'m not losing track of half of them.',
      name: 'Mike D.',
      company: 'Apex Roofing LLC',
      location: 'Dallas, TX',
      initials: 'MD',
    },
    keywords: [
      'roofing contractor software',
      'roofing estimate software',
      'roofing business app',
      'software for roofers',
      'roofing job management',
      'roofing invoice software',
    ],
    metaTitle: 'WorkPilot for Roofers — Roofing Contractor Software',
    metaDescription:
      'Roofing contractor software for fast estimates, professional invoicing and multi-crew scheduling. Built for roofers who run busy operations.',
  },

  hvac: {
    slug: 'hvac',
    name: 'HVAC Contractor',
    namePlural: 'HVAC Contractors',
    icon: '❄️',
    headline: 'HVAC Business Software for Service, Install and Maintenance Jobs',
    subheadline:
      'Handle service calls, installations and maintenance contracts in one place. WorkPilot gives HVAC contractors total control of their operation.',
    pains: [
      'Service calls, maintenance contracts and installs need completely different workflows',
      'Techs in the field can\'t access job history or equipment info',
      'Dispatching multiple crews to emergency calls is chaos without a system',
      'Seasonal peaks mean 3x the jobs with the same admin capacity',
    ],
    benefits: [
      'Quote service calls, installs and maintenance plans from templates',
      'Field app gives techs job details, history and checklists on-site',
      'Dispatch crews to urgent calls without the phone tag',
      'Track parts and labor cost per job — know your margins',
      'Invoice customers the same day the job is done',
    ],
    testimonial: {
      quote:
        'We run 8 service techs across two cities. WorkPilot is the first app that didn\'t require a 6-week onboarding process.',
      name: 'Sandra R.',
      company: 'CoolAir HVAC',
      location: 'Phoenix, AZ',
      initials: 'SR',
    },
    keywords: [
      'HVAC business software',
      'HVAC contractor app',
      'HVAC estimate software',
      'HVAC dispatch software',
      'HVAC job management',
      'software for HVAC contractors',
    ],
    metaTitle: 'WorkPilot for HVAC Contractors — HVAC Business Management App',
    metaDescription:
      'HVAC business software for service calls, installs and maintenance. Dispatch crews, track job costs and invoice same-day. Free 14-day trial.',
  },

  'general-contractors': {
    slug: 'general-contractors',
    name: 'General Contractor',
    namePlural: 'General Contractors',
    icon: '🏗️',
    headline: 'General Contractor Software to Manage Every Job, Every Trade',
    subheadline:
      'Coordinate subcontractors, track job costs and deliver professional estimates faster than your competition.',
    pains: [
      'Coordinating subs, owners and your own crew requires constant back-and-forth',
      'Change orders get lost in email threads and never get invoiced properly',
      'Budget vs actual tracking across trades is nearly impossible in spreadsheets',
      'Clients expect professional proposals fast or they go elsewhere',
    ],
    benefits: [
      'Comprehensive estimates with trade breakdowns and allowances',
      'Real-time budget vs actual tracking across every cost category',
      'Schedule your crews and subcontractors in one visual calendar',
      'Change order documentation built into every job',
      'Send professional proposals in minutes, not hours',
    ],
    testimonial: {
      quote:
        'I manage 12 active projects at a time. WorkPilot is the first tool that actually helps me see how each one is performing financially.',
      name: 'Jennifer T.',
      company: 'BuildRight General Contractors',
      location: 'Phoenix, AZ',
      initials: 'JT',
    },
    keywords: [
      'general contractor software',
      'construction management app',
      'contractor business software',
      'construction estimate software',
      'general contractor app',
      'job costing software contractors',
    ],
    metaTitle: 'WorkPilot for General Contractors — Construction Business Software',
    metaDescription:
      'General contractor software for estimates, job costing, crew scheduling and invoicing. Manage every trade in one place. Try free for 14 days.',
  },

  landscapers: {
    slug: 'landscapers',
    name: 'Landscaper',
    namePlural: 'Landscapers',
    icon: '🌿',
    headline: 'Landscaping Business Software Built for Crews on the Move',
    subheadline:
      'Estimate landscape jobs faster, schedule recurring maintenance and invoice clients same-day with WorkPilot.',
    pains: [
      'Recurring maintenance clients need consistent billing that\'s hard to manage manually',
      'Seasonal jobs create invoice backlogs that delay cash flow',
      'Plant material costs vary constantly and paper estimates don\'t reflect that',
      'Multiple crews across multiple properties with no central scheduling',
    ],
    benefits: [
      'Quick estimates with plant material, labor and equipment templates',
      'Schedule recurring maintenance jobs with your whole crew',
      'Invoice clients immediately after the job is done — from your phone',
      'Track costs per property to know which accounts are most profitable',
      'Field app for crew check-ins, photos and task completion',
    ],
    testimonial: {
      quote:
        'I manage 80 recurring landscape accounts. WorkPilot cut my admin time in half and my clients get invoices the same day.',
      name: 'Luis G.',
      company: 'GreenEdge Landscaping',
      location: 'San Antonio, TX',
      initials: 'LG',
    },
    keywords: [
      'landscaping business software',
      'landscaping contractor app',
      'landscaping estimate software',
      'lawn care business app',
      'landscaping invoice software',
      'software for landscapers',
    ],
    metaTitle: 'WorkPilot for Landscapers — Landscaping Business Management App',
    metaDescription:
      'Landscaping software for estimates, recurring maintenance scheduling and same-day invoicing. Built for landscaping contractors under $5M.',
  },

  painters: {
    slug: 'painters',
    name: 'Painter',
    namePlural: 'Painters',
    icon: '🎨',
    headline: 'Painting Contractor Software for Interior, Exterior and Commercial Jobs',
    subheadline:
      'Win more painting bids with fast, professional estimates. WorkPilot keeps your painting business organized from quote to final payment.',
    pains: [
      'Accurate paint estimates require complex calculations most contractors do manually',
      'Clients expect a written proposal fast — delays lose the job',
      'Tracking which jobs are paid vs outstanding is a constant headache',
      'Managing a painting crew across multiple job sites without real-time visibility',
    ],
    benefits: [
      'Paint estimate templates for interior, exterior and commercial projects',
      'Professional proposals delivered to clients in minutes',
      'Track which invoices are paid, pending or overdue at a glance',
      'Schedule painting crews across multiple active job sites',
      'Before/after photo documentation from the field app',
    ],
    testimonial: {
      quote:
        'I used to spend Sunday night doing invoices. Now I send them from my phone while I\'m still at the job site. Clients pay faster too.',
      name: 'David P.',
      company: 'Premier Painting Co.',
      location: 'Charlotte, NC',
      initials: 'DP',
    },
    keywords: [
      'painting contractor software',
      'painting business app',
      'painting estimate software',
      'software for painters',
      'painting contractor app',
      'paint job management software',
    ],
    metaTitle: 'WorkPilot for Painters — Painting Contractor Software',
    metaDescription:
      'Painting contractor software for fast estimates, professional proposals and same-day invoicing. Manage your painting crews in one app.',
  },

  remodelers: {
    slug: 'remodelers',
    name: 'Remodeling Contractor',
    namePlural: 'Remodeling Contractors',
    icon: '🪟',
    headline: 'Remodeling Contractor Software for Kitchen, Bath and Home Projects',
    subheadline:
      'From the first estimate to the final invoice, WorkPilot keeps every remodeling job profitable and on budget.',
    pains: [
      'Remodeling jobs involve dozens of trades, vendors and change orders to track',
      'Clients request updates constantly — hard to stay organized without a system',
      'Material costs and scope changes blow budgets that were set months ago',
      'Collections on completed jobs drag on for weeks',
    ],
    benefits: [
      'Detailed estimates with room-by-room cost breakdowns',
      'Track every change order and get client approval before the work begins',
      'Real-time budget vs actual across materials, labor and subs',
      'Professional invoice delivery so clients pay on schedule',
      'Client portal gives homeowners job progress without the calls',
    ],
    testimonial: {
      quote:
        'Remodeling is all about managing expectations. WorkPilot gives my clients visibility into the project without me being on the phone all day.',
      name: 'Maria S.',
      company: 'Panes & Sons Remodeling',
      location: 'Miami, FL',
      initials: 'MS',
    },
    keywords: [
      'remodeling contractor software',
      'home remodeling business app',
      'remodeling estimate software',
      'renovation contractor app',
      'remodeling job management',
      'kitchen remodeling software',
    ],
    metaTitle: 'WorkPilot for Remodeling Contractors — Remodeling Business Software',
    metaDescription:
      'Remodeling contractor software for detailed estimates, change order tracking and professional invoicing. Built for contractors under $5M revenue.',
  },
}

export function getTrade(slug: string): Trade | undefined {
  return TRADES[slug]
}

export function getAllTradeSlugs(): string[] {
  return Object.keys(TRADES)
}
