import { notFound } from 'next/navigation'
import { getShoppingList } from '@/lib/actions/shopping-lists'
import { requireUser } from '@/lib/actions/auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { PrintControls } from './_components/PrintControls'

export default async function PrintShoppingListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await requireUser()
  const [list, user] = await Promise.all([
    getShoppingList(id),
    dbAdapter.users.findById(userId),
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
    <div className="bg-white min-h-screen">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
          input[type='checkbox'] { accent-color: #1E3A5F; }
        }
      `}</style>

      <PrintControls />

      <div className="max-w-2xl mx-auto px-12 py-10 print:px-0 print:py-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A5F]">{companyName}</h1>
            {companyPhone && <p className="text-slate-500 text-sm mt-1">{companyPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Shopping List</p>
            <h2 className="text-xl font-bold text-slate-800">{list.name}</h2>
            <p className="text-slate-500 text-xs mt-1">
              {new Date(list.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Linked job */}
        {job && (
          <div className="mb-6 p-3 bg-slate-50 rounded-lg text-sm">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 mr-2">Job</span>
            <span className="font-semibold text-slate-800">{job.name}</span>
            <span className="text-slate-500 ml-2">· {job.clientName}</span>
          </div>
        )}

        {/* To-buy items */}
        {pendingItems.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">To buy ({pendingItems.length})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="w-8"></th>
                  <th className="text-left py-2 font-semibold text-slate-700">Item</th>
                  <th className="text-center py-2 font-semibold text-slate-700 w-20">Qty</th>
                  <th className="text-right py-2 font-semibold text-slate-700 w-24">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map(item => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2.5">
                      <input type="checkbox" className="w-4 h-4" />
                    </td>
                    <td className="py-2.5 text-slate-700">
                      {item.description}
                      {item.unit && <span className="text-slate-400 text-xs ml-1">({item.unit})</span>}
                    </td>
                    <td className="py-2.5 text-center text-slate-500">
                      {item.quantity ? parseFloat(item.quantity).toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 text-right text-slate-700 font-mono">
                      ${parseFloat(item.estimatedCost).toLocaleString()}
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
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Already purchased ({purchasedItems.length})</h3>
            <table className="w-full text-sm">
              <tbody>
                {purchasedItems.map(item => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2 w-8 text-green-600 font-bold">✓</td>
                    <td className="py-2 text-slate-500 line-through">
                      {item.description}
                    </td>
                    <td className="py-2 text-right text-slate-500 font-mono w-24">
                      ${parseFloat(item.estimatedCost).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="ml-auto max-w-xs mt-6">
          <div className="space-y-1.5 text-sm border-t border-slate-200 pt-3">
            {purchasedItems.length > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Purchased</span>
                <span className="font-mono">${purchasedCost.toLocaleString()}</span>
              </div>
            )}
            {pendingItems.length > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Still to buy</span>
                <span className="font-mono">${pendingCost.toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between text-base font-bold text-[#1E3A5F] pt-2 mt-2 border-t-2 border-[#1E3A5F]">
            <span>Total estimated</span>
            <span className="font-mono">${totalCost.toLocaleString()}</span>
          </div>
        </div>

        {list.items.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-12">This list has no items.</p>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-100 text-xs text-slate-400 text-center">
          {companyName} · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </div>
  )
}
