import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getShoppingList } from '@/lib/actions/shopping-lists'
import { requireUser } from '@/lib/actions/auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { PrintControls } from './_components/PrintControls'

export default async function PrintShoppingListPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US'
  const userId = await requireUser()
  const [list, user, tc, tp] = await Promise.all([
    getShoppingList(id),
    dbAdapter.users.findById(userId),
    getTranslations('print.common'),
    getTranslations('print.shoppingList'),
  ])
  if (!list) notFound()

  const companyName = user?.companyName || 'WorkPilot'
  const companyPhone = user?.phone || ''

  const pendingItems = list.items.filter(it => it.status === 'pending')
  const purchasedItems = list.items.filter(it => it.status === 'purchased')
  const totalCost = list.items.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
  const purchasedCost = purchasedItems.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
  const pendingCost = pendingItems.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)

  // Linked job (optional) — shows contractor which job this list belongs to.
  const job = list.jobId ? await dbAdapter.jobs.findById(list.jobId, userId) : null

  return (
    <div className="bg-card min-h-screen">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
          input[type='checkbox'] { accent-color: var(--wp-navy-500); }
        }
      `}</style>

      <PrintControls />

      <div className="max-w-2xl mx-auto px-12 py-10 print:px-0 print:py-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-navy-500">{companyName}</h1>
            {companyPhone && <p className="text-muted-foreground text-sm mt-1">{companyPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-subtle-foreground mb-1">{tp('label')}</p>
            <h2 className="text-xl font-bold text-foreground">{list.name}</h2>
            <p className="text-muted-foreground text-xs mt-1">
              {new Date(list.createdAt).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Linked job */}
        {job && (
          <div className="mb-6 p-3 bg-muted rounded-lg text-sm">
            <span className="text-xs font-semibold uppercase tracking-widest text-subtle-foreground mr-2">{locale === 'es' ? 'Proyecto' : 'Project'}</span>
            <span className="font-semibold text-foreground">{job.name}</span>
            <span className="text-muted-foreground ml-2">· {job.clientName}</span>
          </div>
        )}

        {/* To-buy items */}
        {pendingItems.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{tp('toBuy')} ({pendingItems.length})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-8"></th>
                  <th className="text-left py-2 font-semibold text-foreground">{tc('item')}</th>
                  <th className="text-center py-2 font-semibold text-foreground w-20">{tc('qty')}</th>
                  <th className="text-right py-2 font-semibold text-foreground w-24">{tp('estCost')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map(item => (
                  <tr key={item.id} className="border-b border-border">
                    <td className="py-2.5">
                      <input type="checkbox" className="w-4 h-4" />
                    </td>
                    <td className="py-2.5 text-foreground">
                      {item.description}
                      {item.unit && <span className="text-subtle-foreground text-xs ml-1">({item.unit})</span>}
                    </td>
                    <td className="py-2.5 text-center text-muted-foreground">
                      {item.quantity ? parseFloat(item.quantity).toLocaleString('en-US') : '—'}
                    </td>
                    <td className="py-2.5 text-right text-foreground font-mono">
                      ${parseFloat(item.estimatedCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Already purchased */}
        {purchasedItems.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{tp('alreadyPurchased')} ({purchasedItems.length})</h3>
            <table className="w-full text-sm">
              <tbody>
                {purchasedItems.map(item => (
                  <tr key={item.id} className="border-b border-border">
                    <td className="py-2 w-8 text-green-600 font-bold">✓</td>
                    <td className="py-2 text-muted-foreground line-through">
                      {item.description}
                    </td>
                    <td className="py-2 text-right text-muted-foreground font-mono w-24">
                      ${parseFloat(item.estimatedCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="ml-auto max-w-xs mt-6">
          <div className="space-y-1.5 text-sm border-t border-border pt-3">
            {purchasedItems.length > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{tp('purchased')}</span>
                <span className="font-mono">${purchasedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {pendingItems.length > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{tp('stillToBuy')}</span>
                <span className="font-mono">${pendingCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between text-base font-bold text-navy-500 pt-2 mt-2 border-t-2 border-navy-500">
            <span>{tp('totalEstimated')}</span>
            <span className="font-mono">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {list.items.length === 0 && (
          <p className="text-center text-subtle-foreground text-sm py-12">{tp('noItems')}</p>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border text-xs text-subtle-foreground text-center">
          {companyName} · {new Date().toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </div>
  )
}
