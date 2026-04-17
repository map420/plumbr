import React from 'react'
import './rich-blocks.css'

export type ActionBlock = { label: string; type: 'navigate' | 'send'; target: string }
export type RenderContext = { jobId?: string }
export type ChecklistData = {
  jobId?: string  // optional: null if AI didn't specify, user must pick
  jobResolved: boolean  // true if AI explicitly tagged the job (via marker)
  items: { description: string; estimatedCost: number }[]
}

// Strip <!-- job:id --> marker from display text
export function stripJobMarker(text: string): string {
  return text.replace(/<!--\s*job:[^>]*-->/gi, '').trim()
}

// Extract job marker from text: <!-- job:abc-123 -->
function extractJobMarker(text: string): string | null {
  const m = text.match(/<!--\s*job:([0-9a-f-]+)\s*-->/i)
  return m ? m[1] : null
}

// Extract checklist data from text (without rendering)
export function extractChecklist(text: string, context?: RenderContext): ChecklistData | null {
  const cleanText = text.replace(/\{\{ACTION:.*?\}\}/g, '').trim()
  const fullTextLower = cleanText.toLowerCase()
  const isMaterialContext = /material|comprar|faltante|lista de compras|checklist|que te falta|necesitas comprar|items? (que|para)|faltan por|orden de compra/i.test(fullTextLower)
  if (!isMaterialContext) return null

  const lines = cleanText.split('\n')
  const bulletLines: string[] = []
  for (const line of lines) {
    if (/^[\s]*[-•*]\s/.test(line)) {
      bulletLines.push(line.replace(/^[\s]*[-•*]\s+/, '').replace(/^\[[\sx]?\]\s*/i, '').trim())
    }
  }

  const itemsWithCost = bulletLines.filter(it => /\$[\d,]+(?:\.\d{2})?/.test(it))
  if (itemsWithCost.length < 2) return null

  const checklistItems = bulletLines.map(item => {
    const costMatch = item.match(/\$\s*([\d,]+(?:\.\d{2})?)/)
    const cost = costMatch ? parseFloat(costMatch[1].replace(',', '')) : 0
    const desc = item
      .replace(/\s*-\s*\$\s*[\d,]+(?:\.\d{2})?\s*$/, '')
      .replace(/\s*[=:]\s*\$\s*[\d,]+(?:\.\d{2})?\s*$/, '')
      .replace(/\s*~\s*\$\s*[\d,]+(?:\.\d{2})?\s*$/, '')
      .replace(/\*\*/g, '')
      .trim()
    return { description: desc, estimatedCost: cost }
  }).filter(item => item.estimatedCost > 0)

  if (checklistItems.length < 2) return null

  // Resolve job: prefer explicit AI marker, fallback to context
  const markerJobId = extractJobMarker(text)
  const jobId = markerJobId || context?.jobId
  return {
    jobId,
    jobResolved: !!markerJobId,
    items: checklistItems,
  }
}

// ── Parse {{ACTION:...}} blocks ──
export function parseActions(text: string): { cleanText: string; actions: ActionBlock[] } {
  const actions: ActionBlock[] = []
  const cleanText = text.replace(/\{\{ACTION:(.*?)\}\}/g, (_, content) => {
    const [label, type, target] = content.split('|').map((s: string) => s.trim())
    if (label && type && target) {
      actions.push({ label, type: type as 'navigate' | 'send', target })
    }
    return ''
  }).trim()
  return { cleanText, actions }
}

// ── Action Buttons ──
export function ActionButtons({ actions, onAction }: { actions: ActionBlock[]; onAction: (action: ActionBlock) => void }) {
  if (actions.length === 0) return null
  const visible = actions.slice(0, 4)
  const hasMore = actions.length > 4
  return (
    <div className="blk-actions" style={{ marginTop: 14 }}>
      {visible.map((action, i) => (
        <button key={i} onClick={() => onAction(action)} className="blk-action-btn blk-action-ghost">
          {action.label}
        </button>
      ))}
      {hasMore && (
        <button onClick={() => onAction({ label: 'Other', type: 'send', target: 'Other — let me describe what I need' })}
          className="blk-action-btn blk-action-ghost" style={{ color: 'var(--wp-text-muted)' }}>
          Other...
        </button>
      )}
    </div>
  )
}

// ── Highlight $amounts and **bold** in text ──
function highlightText(text: string): React.ReactNode {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<span class="h">$1</span>')
    .replace(/\$[\d,]+(\.\d{1,2})?/g, '<span class="n">$&</span>')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// ── Detect bullet line (-, •, *, or indented -) ──
function isBulletLine(line: string): boolean {
  return /^[\s]*[-•*]\s/.test(line)
}

function stripBullet(line: string): string {
  return line.replace(/^[\s]*[-•*]\s+/, '')
}

// ── Detect numbered line (1. or 1)) ──
function isNumberedLine(line: string): boolean {
  return /^[\s]*\d+[\.\)]\s/.test(line)
}

function stripNumber(line: string): string {
  return line.replace(/^[\s]*\d+[\.\)]\s+/, '')
}

// ── Detect insight variant from text keywords ──
// Priority: negative > warning > positive > info > null
// Skips conditional phrases (si no, para no) and double negations (no es que... no)
function getInsightVariant(text: string): { variant: string; icon: string } | null {
  const lower = text.toLowerCase()

  // Skip conditionals and hypotheticals — render as neutral
  if (/\b(si no|para no|en caso de|podr[ií]a[s]?\s|deber[ií]a[s]?\s|conviene|te recomiendo|sugerencia|consejo|tip\b|regla general|buena práctica|normalmente|históricamente|el mes pasado|antes\b|promedio del)/i.test(lower)) {
    // Check if it's INFO first
    if (/\b(regla\s+general|tip|consejo|sugerencia|promedio|benchmark|dato|para\s+contexto|como\s+referencia|lo\s+ideal|una\s+buena\s+meta|esto\s+(significa|indica|implica|sugiere))/i.test(lower))
      return { variant: 'info', icon: 'i' }
    // Conditionals that suggest action are INFO, not warning
    if (/\b(deber[ií]a[s]?|conviene|te recomiendo)\s/i.test(lower))
      return { variant: 'info', icon: 'i' }
    return null
  }

  // Skip double negation — "no es que no paguen" is not negative
  if (/no\s+es\s+que\s+.*\s+no\b/i.test(lower)) return null

  // ── NEGATIVE (red) — highest priority ──
  if (
    /\b(colapso|cr[ií]tic[oa]|perdiste|pérdida|moroso|morosa|cancelad[oa]|rechazad[oa]|déficit|en\s+rojo|impago|eliminad[oa]|fracasó|falló|falla|abandonad?[oa]|sin\s+actividad|inactiv[oa]|pipeline\s+(vac[ií]o|muerto))\b/i.test(lower) ||
    /\b(vencido|vencida|vencidos|vencidas)\b/i.test(lower) ||
    /\b(no\s+pagó|no\s+ha\s+pagado|sin\s+pagar)\b/i.test(lower) ||
    /\b(cero\s+ingresos|sin\s+ingresos|vac[ií][oa])\b/i.test(lower) ||
    /\b0\s+(completad|pagad|cobrad|cerrad)/i.test(lower) ||
    /pérdida\s+de\s+\$/i.test(lower) ||
    /(sin|no\s+tiene[ns]?)\s+(ingreso|cliente|trabajo|factura|pago)/i.test(lower) ||
    /\b(100|9\d)\s*%.*concentraci[oó]n/i.test(lower) ||
    /concentraci[oó]n.*\b(9\d|100)\s*%/i.test(lower) ||
    /\bconversi[oó]n\s+nula\b/i.test(lower) ||
    /\b(flujo|cash\s*flow)\s+negativ/i.test(lower) ||
    /más\s+gastos\s+que\s+ingresos/i.test(lower) ||
    /\bnunca\s+se\s+inici[oó]\b/i.test(lower) ||
    /\btrabajo\s+parado\b/i.test(lower) ||
    /\bsolo\s+\d+\s+trabajos?\s+activos?\s+pero\b/i.test(lower)
  ) return { variant: 'negative', icon: '✗' }

  // ── WARNING (amber) ──
  if (
    /\b(pendiente[s]?|por\s+cobrar|por\s+facturar|atrasad[oa]s?|retrasad[oa]s?|congelad[oa]|estancad[oa]|por\s+vencer|sin\s+enviar|sin\s+respuesta|en\s+espera|en\s+pausa|pausado|por\s+aprobar|sin\s+aprobar|incompleto|incompleta|falta[n]?)\b/i.test(lower) ||
    /\b(borrador|draft|en\s+draft)\b/i.test(lower) ||
    /\b(lent[oa]|baja\s+conversi[oó]n|conversi[oó]n\s+(lenta|baja))\b/i.test(lower) ||
    /\b(seguimiento|dar\s+seguimiento|necesita\s+seguimiento)\b/i.test(lower) ||
    /\b(no|sin)\s+(ha[s]?\s+)?(enviado|respondido|aprobado|confirmado)\b/i.test(lower) ||
    /\b(por|sin)\s+(facturar|cobrar|enviar|aprobar|completar|cerrar)\b/i.test(lower) ||
    /\bfalta[n]?\s+\d+/i.test(lower) ||
    /\b(llevas?|tiene[s]?)\s+\d+\s+(d[ií]as?|semanas?)\s+sin\b/i.test(lower) ||
    /\bsolo\s+\d+\s+(de|\/)\s+\d+\b/i.test(lower) ||
    /\bdinero\s+(potencial\s+)?congelado\b/i.test(lower) ||
    /\ba[uú]n\s+no\s+(has|se)\b/i.test(lower) ||
    /\btodav[ií]a\s+no\b/i.test(lower) ||
    /\boportunidad\s+que\s+se\s+enfr[ií]a\b/i.test(lower) ||
    /\bhubo\s+conversi[oó]n\s+lenta\b/i.test(lower)
  ) return { variant: 'warning', icon: '!' }

  // ── POSITIVE (green) ──
  if (
    /\b(pagad[oa]s?|cobrad[oa]s?|completad[oa]s?|terminad[oa])\b/i.test(lower) ||
    /\b(al\s+d[ií]a|a\s+tiempo|puntual|excelente|san[oa]|saludable|[oó]ptim[oa]|impecable)\b/i.test(lower) ||
    /\b(aprobad[oa]|aceptad[oa]|confirmad[oa])\b/i.test(lower) ||
    /\b(crecimiento|creci[oó]|aument[oó]|subi[oó]|mejor[oó]|récord)\b/i.test(lower) ||
    /\b(nuevo\s+cliente|cliente\s+nuev[oa]|ganaste\s+un\s+cliente)\b/i.test(lower) ||
    /\btodo\s+(pagad|cobrad|facturad|completad)/i.test(lower) ||
    /\bcero\s+(vencid|moroso|pendiente|deuda)/i.test(lower) ||
    /\b0\s+(vencid|moroso)/i.test(lower) ||
    /\bcobranza\s+(perfecta|impecable|excelente|al\s+d[ií]a)/i.test(lower) ||
    /\b(cash\s*flow|flujo)\s+(sano|positivo|excelente|limpio)/i.test(lower) ||
    /\b(sin|no\s+hay)\s+(facturas?\s+)?vencid/i.test(lower) ||
    /\bnada\s+pendiente\b/i.test(lower) ||
    /\bpipeline\s+(limpio|sano)\b/i.test(lower) ||
    /\b(buen\s+ritmo|vas\s+bien|excelente\s+mes)\b/i.test(lower) ||
    /\bsuperaste\b/i.test(lower)
  ) return { variant: 'positive', icon: '✓' }

  // ── INFO (blue) ──
  if (
    /\b(tip|consejo|recomendaci[oó]n|sugerencia)\b/i.test(lower) ||
    /\b(regla\s+general|buena\s+pr[aá]ctica|mejor\s+pr[aá]ctica)\b/i.test(lower) ||
    /\b(dato|para\s+tu\s+referencia|para\s+contexto|como\s+referencia)\b/i.test(lower) ||
    /\b(promedio|benchmark|comparaci[oó]n|comparado\s+con)\b/i.test(lower) ||
    /\b(significa\s+que|esto\s+indica|lo\s+que\s+implica)\b/i.test(lower) ||
    /\b(ten\s+en\s+cuenta|considera|recuerda\s+que)\b/i.test(lower) ||
    /\b(lo\s+ideal|una\s+buena\s+meta)\b/i.test(lower) ||
    /\bnormalmente\s+(un|una|el|la|los|las)\b/i.test(lower) ||
    /\ben\s+la\s+industria\b/i.test(lower) ||
    /\b(parcial|parciales|solo\s+los\s+gastos)\b/i.test(lower) ||
    /\b(o\s+estos\s+son)\b/i.test(lower)
  ) return { variant: 'info', icon: 'i' }

  return null
}

// ═══ Main renderer: markdown → Rich visual components ═══
export function renderContent(text: string, context?: RenderContext) {
  const parts: React.ReactNode[] = []

  const cleanText = text
    .replace(/\{\{ACTION:.*?\}\}/g, '')
    .replace(/\{\{ACTION:.*$/g, '')
    .replace(/```blocks\s*\n?[\s\S]*?\n?```/g, '')
    .replace(/```blocks\s*\n?[\s\S]*$/g, '')
    .replace(/<!--\s*job:[^>]*-->/gi, '')
    .trim()

  if (!cleanText) return parts

  const lines = cleanText.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // ── Chart blocks ──
    if (line.trim() === '```chart') {
      let json = ''
      i++
      while (i < lines.length && lines[i].trim() !== '```') { json += lines[i]; i++ }
      i++
      try {
        const data = JSON.parse(json)
        const max = Math.max(...data.values, 1)
        parts.push(
          <div key={`chart-${parts.length}`} className="blk-clients">
            {data.labels.map((label: string, idx: number) => (
              <React.Fragment key={idx}>
                <div className="blk-client-row">
                  <div className="blk-client-dot primary" />
                  <div className="blk-client-detail"><div className="blk-client-name">{label}</div></div>
                  <div className="blk-client-amount">${data.values[idx].toLocaleString()}</div>
                </div>
                <div className="blk-client-bar">
                  <div className="blk-client-bar-fill" style={{ width: `${(data.values[idx] / max) * 100}%` }} />
                </div>
              </React.Fragment>
            ))}
          </div>
        )
      } catch {}
      continue
    }

    // ── Code blocks (skip) ──
    if (line.trim().startsWith('```')) {
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) i++
      i++
      continue
    }

    // ── Markdown tables ──
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]); i++
      }
      if (tableLines.length >= 2) {
        const parseRow = (l: string) => l.split('|').filter(c => c.trim()).map(c => c.trim())
        const headers = parseRow(tableLines[0])
        const isSep = (l: string) => /^\|[\s\-:|]+\|$/.test(l.trim())
        const dataStart = isSep(tableLines[1]) ? 2 : 1
        const rows = tableLines.slice(dataStart).map(parseRow)
        parts.push(
          <div key={`table-${parts.length}`} className="blk-table">
            <div className="blk-table-head">
              {headers.map((h, hi) => <span key={hi}>{h}</span>)}
            </div>
            {rows.map((row, ri) => (
              <div key={ri} className="blk-table-row">
                {row.map((cell, ci) => <span key={ci}>{highlightText(cell)}</span>)}
              </div>
            ))}
          </div>
        )
        continue
      }
    }

    // ── Headings ──
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      if (level >= 3) {
        // h3+ = inline label (bold prose, no separator)
        parts.push(
          <div key={`h-${parts.length}`} className="blk-prose" style={{
            fontWeight: 600, fontSize: 13, color: 'var(--wp-text-primary)',
            marginTop: parts.length > 0 ? 10 : 0, marginBottom: 2,
          }}>
            {highlightText(headingMatch[2])}
          </div>
        )
      } else {
        // h1/h2 = section heading with separator
        const size = level === 1 ? 16 : 15
        parts.push(
          <div key={`h-${parts.length}`} style={{
            fontWeight: 600, fontSize: size, color: 'var(--wp-text-primary)',
            marginTop: parts.length > 0 ? 18 : 0, marginBottom: 6,
            paddingBottom: 6,
            borderBottom: '1px solid var(--wp-border-light)',
          }}>
            {highlightText(headingMatch[2])}
          </div>
        )
      }
      i++; continue
    }

    // ── Numbered lists ──
    if (isNumberedLine(line)) {
      const listItems: string[] = []
      while (i < lines.length && isNumberedLine(lines[i])) {
        listItems.push(stripNumber(lines[i]))
        i++
      }
      parts.push(
        <div key={`nlist-${parts.length}`} className="blk-list">
          {listItems.map((item, idx) => {
            const insight = getInsightVariant(item)
            if (insight) {
              return (
                <div key={idx} className={`blk-insight ${insight.variant}`}>
                  <span className="blk-insight-icon">{insight.icon}</span>
                  <span>{highlightText(item)}</span>
                </div>
              )
            }
            return (
              <div key={idx} className="blk-list-item">
                <div className="blk-list-icon">{idx + 1}</div>
                <div>{highlightText(item)}</div>
              </div>
            )
          })}
        </div>
      )
      continue
    }

    // ── Bullet lists ──
    if (isBulletLine(line)) {
      const listItems: string[] = []
      while (i < lines.length && isBulletLine(lines[i])) {
        listItems.push(stripBullet(lines[i]))
        i++
      }

      // Clean [ ] checkbox patterns from items
      const cleanItems = listItems.map(it => it.replace(/^\[[\sx]?\]\s*/i, '').trim())

      // Check if any items are insights
      const hasInsights = listItems.some(it => getInsightVariant(it) !== null)

      if (hasInsights) {
        parts.push(
          <div key={`insights-${parts.length}`} className="blk-insights">
            {listItems.map((item, idx) => {
              const insight = getInsightVariant(item) || { variant: 'info', icon: 'i' }
              return (
                <div key={idx} className={`blk-insight ${insight.variant}`}>
                  <span className="blk-insight-icon">{insight.icon}</span>
                  <span>{highlightText(item)}</span>
                </div>
              )
            })}
          </div>
        )
      } else {
        parts.push(
          <div key={`blist-${parts.length}`} className="blk-list">
            {listItems.map((item, idx) => {
              // Split amount to the right if item ends with = $X or : $X
              const amountMatch = item.match(/[=:]\s*(\$[\d,]+(?:\.\d{2})?)\s*$/)
              if (amountMatch) {
                const textPart = item.slice(0, item.lastIndexOf(amountMatch[0]))
                return (
                  <div key={idx} className="blk-list-item" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                      <div className="blk-list-icon">•</div>
                      <div>{highlightText(textPart)}</div>
                    </div>
                    <span className="blk-list-amount">{highlightText(amountMatch[1])}</span>
                  </div>
                )
              }
              return (
                <div key={idx} className="blk-list-item">
                  <div className="blk-list-icon">•</div>
                  <div>{highlightText(item)}</div>
                </div>
              )
            })}
          </div>
        )
      }
      continue
    }

    // ── Horizontal rule ──
    if (/^---+$/.test(line.trim())) {
      parts.push(<div key={`hr-${parts.length}`} style={{ height: 1, background: 'var(--wp-border-light)', margin: '12px 0' }} />)
      i++; continue
    }

    // ── Empty line ──
    if (!line.trim()) { i++; continue }

    // ── Prose: collect consecutive text lines ──
    const proseLines: string[] = []
    while (i < lines.length &&
      lines[i].trim() &&
      !lines[i].match(/^#{1,3}\s/) &&
      !isBulletLine(lines[i]) &&
      !isNumberedLine(lines[i]) &&
      !(lines[i].includes('|') && lines[i].trim().startsWith('|')) &&
      !lines[i].trim().startsWith('```') &&
      !/^---+$/.test(lines[i].trim())
    ) {
      proseLines.push(lines[i])
      i++
    }

    if (proseLines.length > 0) {
      parts.push(
        <div key={`prose-${parts.length}`} className="blk-prose">
          {highlightText(proseLines.join(' '))}
        </div>
      )
    }
  }

  return parts
}
