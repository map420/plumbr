export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  publishedAt: string
  readMinutes: number
  author: { name: string; role: string; initials: string }
  keywords: string[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-estimate-a-job-as-a-contractor',
    title: 'How to Estimate a Job as a Contractor (Without Losing Money)',
    excerpt:
      'Most contractor estimates are wrong before the job even starts. Learn the 5-step system that protects your margins every time.',
    category: 'Estimating',
    publishedAt: '2026-04-10',
    readMinutes: 6,
    author: { name: 'WorkPilot Team', role: 'Construction Operations', initials: 'WP' },
    keywords: ['contractor estimate', 'how to estimate a job', 'job estimating for contractors', 'construction estimate'],
    content: `
<p>Estimating is the most important skill in contracting — and the most punishing when you get it wrong. A 10% mistake on a $50,000 job costs you $5,000. Here's the system that protects your margins.</p>

<h2>Step 1: Scope the job completely before you price it</h2>
<p>The most common estimating mistake is pricing before you fully understand what you're building. Walk the job. Ask questions. Scope creep is the #1 margin killer — and it starts with an incomplete scope.</p>
<p><strong>Before you open your calculator:</strong> What are the deliverables? What's included vs. excluded? What does "done" look like to the client?</p>

<h2>Step 2: Price materials at today's cost, not last year's</h2>
<p>Material costs change every quarter. If you're using a spreadsheet from 6 months ago, you're estimating with bad data. Call your supplier. Check current pricing. Add a 10% buffer for overages.</p>

<h2>Step 3: Calculate labor at your true cost</h2>
<p>Most contractors underestimate labor. Your true labor cost isn't just the hourly rate — it's:</p>
<ul>
<li>Hourly wage × hours</li>
<li>Payroll taxes (~15%)</li>
<li>Workers' comp insurance</li>
<li>Benefits (if any)</li>
<li>Non-billable time (driving, setup, cleanup)</li>
</ul>
<p>Add all of that. Then add your overhead percentage on top.</p>

<h2>Step 4: Add overhead — every job must carry its share</h2>
<p>Your overhead is the cost of running your business regardless of what jobs you have: insurance, tools, truck, phone, software, admin. Calculate your monthly overhead and divide it by the number of jobs per month. Every estimate must cover its share.</p>

<h2>Step 5: Add your profit margin last</h2>
<p>Profit is not what's left over. Profit is a planned line item. Set a target margin (typically 15–30% for most trades) and build it into every estimate. If the market won't support that margin, the job isn't worth taking.</p>

<h2>The 1-minute estimate check</h2>
<p>Before you send any estimate, ask yourself: <em>If everything goes slightly wrong on this job — materials run 10% over, labor runs 15% over — will I still make money?</em> If the answer is no, revise the estimate or pass on the job.</p>

<p>WorkPilot's estimate builder has material and labor templates so you never start from scratch. Once an estimate is approved, it converts to an invoice in one click — no double entry.</p>
    `.trim(),
  },
  {
    slug: 'job-costing-for-contractors',
    title: 'Job Costing for Contractors: Know Your Profit Before the Job Ends',
    excerpt:
      "Job costing is the difference between contractors who grow and contractors who stay stuck. Here's how to track it in real time.",
    category: 'Finance',
    publishedAt: '2026-04-08',
    readMinutes: 5,
    author: { name: 'WorkPilot Team', role: 'Construction Operations', initials: 'WP' },
    keywords: ['job costing contractors', 'construction job costing', 'contractor profit tracking', 'how to track job costs'],
    content: `
<p>Most contractors find out a job lost money when they're doing the books — weeks after the work is done. Job costing in real time changes that completely.</p>

<h2>What is job costing?</h2>
<p>Job costing is tracking every dollar spent on a specific job — labor, materials, subcontractors, equipment — and comparing it to what you budgeted. The gap between budgeted and actual is your warning signal.</p>

<h2>Why most contractors don't do it</h2>
<p>Because it used to require a full accounting system. QuickBooks alone can do job costing, but it's painful to set up and painful to use in the field. Most contractors end up skipping it entirely.</p>

<h2>The 3 numbers that matter on every job</h2>
<p><strong>1. Budget:</strong> What you estimated for materials, labor, and subs.<br/>
<strong>2. Actual:</strong> What you've actually spent so far.<br/>
<strong>3. Remaining:</strong> Budget minus actual. Is there enough left to finish?</p>

<h2>When to check job costs</h2>
<p>Not just at the end. Check job costs at 25%, 50%, and 75% completion. If you're already over budget at 50%, you have time to recover. If you find out at 100%, you can only count the loss.</p>

<h2>Common job cost overruns (and how to prevent them)</h2>
<ul>
<li><strong>Labor overruns:</strong> Your crew took longer than estimated. Prevention: track hours per tech per job, not just total hours.</li>
<li><strong>Material waste:</strong> You ordered 20% more material than you used, or 10% less and had to make emergency runs. Prevention: accurate quantity takeoffs before ordering.</li>
<li><strong>Scope creep without change orders:</strong> You did extra work that wasn't in the original scope but didn't charge for it. Prevention: document every change order before the work starts.</li>
</ul>

<h2>How WorkPilot tracks job costs</h2>
<p>WorkPilot tracks budget vs actual in real time as you log expenses. You can see your job margin at any moment — from the office or your phone. No accounting degree required.</p>
    `.trim(),
  },
  {
    slug: 'how-to-invoice-clients-as-a-contractor',
    title: 'How to Invoice Clients as a Contractor (And Get Paid Faster)',
    excerpt:
      'Slow payments kill cash flow. These invoicing habits will get you paid faster without chasing every client.',
    category: 'Getting Paid',
    publishedAt: '2026-04-05',
    readMinutes: 4,
    author: { name: 'WorkPilot Team', role: 'Construction Operations', initials: 'WP' },
    keywords: ['contractor invoicing', 'how to invoice clients', 'construction invoice', 'contractor payment tips'],
    content: `
<p>Getting paid on time is as important as doing the work. Here's the invoicing system that professional contractors use to keep cash flow healthy.</p>

<h2>Invoice the same day the work is done</h2>
<p>Every day you wait to invoice is a day added to when you get paid. The client's memory of the completed work fades. The job feels less urgent. Invoice on completion — that day, from your phone if needed.</p>

<h2>Include everything on the invoice</h2>
<p>A vague invoice creates disputes. Be specific: what work was done, what materials were used, what dates it was completed. A detailed invoice gets paid faster because there's nothing to argue about.</p>

<h2>Set clear payment terms upfront</h2>
<p>Net 30 is standard, but Net 15 is better. And "due upon receipt" is better still for residential clients. Set your payment terms before the job starts, put them in writing on the contract, and repeat them on the invoice.</p>

<h2>Require a deposit on every job</h2>
<p>A deposit of 30–50% before work begins accomplishes two things: it funds your materials purchase, and it filters out clients who aren't serious. Any client who refuses to put down a deposit is a risk.</p>

<h2>Follow up the moment an invoice is late</h2>
<p>The best contractors send a friendly reminder the day an invoice is overdue — not two weeks later. The longer you wait, the harder it gets. Make "check overdue invoices" part of your Monday routine.</p>

<h2>Make it easy to pay</h2>
<p>Every payment method you remove is an excuse to delay payment. Accept ACH, credit card and check. Yes, credit card fees eat 2–3%, but getting paid in 2 days vs 45 days is worth far more.</p>

<p>WorkPilot tracks paid, pending and overdue invoices in one dashboard. You can see at a glance what's outstanding and send a follow-up in seconds.</p>
    `.trim(),
  },
  {
    slug: 'contractor-business-software-guide',
    title: 'The Complete Guide to Contractor Business Software in 2026',
    excerpt:
      "There are dozens of apps built for contractors. Here's how to choose the right one without wasting months on something that doesn't fit.",
    category: 'Software',
    publishedAt: '2026-04-02',
    readMinutes: 8,
    author: { name: 'WorkPilot Team', role: 'Construction Operations', initials: 'WP' },
    keywords: ['contractor business software', 'best software for contractors', 'construction management software 2026', 'contractor app guide'],
    content: `
<p>Contractors are one of the most underserved groups in software. Most "construction management" tools are built for $50M+ general contractors — not for the owner-operator running a 5-person crew. Here's how to choose correctly.</p>

<h2>The 5 features every contractor software must have</h2>

<h3>1. Estimating</h3>
<p>If the software can't help you build an estimate fast with your own costs and templates, it's not built for the field. You should be able to estimate from your phone.</p>

<h3>2. Invoicing</h3>
<p>The estimate should convert to an invoice without re-entering data. Every extra step is a delay. One-click conversion is the standard to hold to.</p>

<h3>3. Job costing</h3>
<p>Budget vs actual tracking, per job, in real time. This is the feature most contractors wish they had five years earlier.</p>

<h3>4. Scheduling</h3>
<p>A visual weekly calendar that shows which crew is on which job. Not a list view — a calendar you can actually use to schedule.</p>

<h3>5. Mobile field app</h3>
<p>Your crew needs to access job details and submit photos from the job site. If the mobile app is an afterthought, move on.</p>

<h2>What to avoid</h2>
<ul>
<li><strong>Per-user pricing:</strong> If you're paying $30/user/month and you have 8 people, that's $240/month just to have everyone in the system. Look for flat-rate pricing.</li>
<li><strong>Enterprise tools scaled down:</strong> Procore and Buildertrend are great — for contractors doing $20M+. For small crews, they're complex, expensive, and overkill.</li>
<li><strong>Accounting-first tools:</strong> QuickBooks is excellent for accounting. It's not a field operations tool. Don't try to make it one.</li>
</ul>

<h2>The right software by revenue</h2>

<table>
<tr><th>Revenue range</th><th>Best fit</th></tr>
<tr><td>Under $500K</td><td>WorkPilot, Jobber</td></tr>
<tr><td>$500K–$3M</td><td>WorkPilot, JobTread</td></tr>
<tr><td>$3M–$20M</td><td>Knowify, CoConstruct</td></tr>
<tr><td>$20M+</td><td>Procore, Buildertrend</td></tr>
</table>

<h2>The honest answer</h2>
<p>For most contractors under $5M, the right software is simple, mobile-first, and flat-rate. It should take less than an hour to set up and less than a day to train your crew. If a demo takes 45 minutes and requires a salesperson, that's not built for you.</p>
    `.trim(),
  },
  {
    slug: 'crew-scheduling-tips-for-contractors',
    title: '5 Crew Scheduling Mistakes Contractors Make (And How to Fix Them)',
    excerpt:
      'Poor scheduling costs you money every week. These 5 fixes will keep your crew productive and your jobs on track.',
    category: 'Operations',
    publishedAt: '2026-03-30',
    readMinutes: 5,
    author: { name: 'WorkPilot Team', role: 'Construction Operations', initials: 'WP' },
    keywords: ['contractor crew scheduling', 'construction crew management', 'how to schedule contractors', 'contractor scheduling tips'],
    content: `
<p>A disorganized schedule costs more than most contractors realize — in fuel, in idle time, in missed jobs, and in frustrated crew members who eventually quit. Here are the 5 most common mistakes and how to fix them.</p>

<h2>Mistake 1: Scheduling in your head</h2>
<p>When your schedule lives only in your head, any sick day, phone issue or unexpected job immediately creates chaos. The fix: get everything into a visual calendar — even a simple one. Externalize the schedule.</p>

<h2>Mistake 2: Overbooking without buffer time</h2>
<p>Every job runs over sometimes. Traffic, material delays, inspection holds — if your schedule has no buffer, every overrun cascades. Build 15–20% buffer time into your weekly schedule. Your clients will notice that you're never late.</p>

<h2>Mistake 3: Not matching skill to job</h2>
<p>Sending your most experienced tech to a routine service call while a junior handles a complex install wastes both of their potential. Match skill level to job complexity. This is impossible to do consistently if your schedule is in your head.</p>

<h2>Mistake 4: Last-minute changes with no communication</h2>
<p>When a job gets moved or a tech calls in sick, your crew shouldn't find out when they show up to the wrong address. Every schedule change needs to be communicated instantly. The field app should notify the crew as soon as the schedule updates.</p>

<h2>Mistake 5: Not planning the week on Monday morning</h2>
<p>The best contractors spend 30 minutes every Monday reviewing the full week: who's scheduled where, what materials need to be ordered, what permits are pending. This one habit prevents most of the fires you spend the rest of the week putting out.</p>

<h2>The tool that fixes all five</h2>
<p>WorkPilot's visual crew scheduling shows every job and every tech on a weekly calendar. You can drag and drop to reschedule, and your crew sees updates instantly on the field app.</p>
    `.trim(),
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug)
}

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}
