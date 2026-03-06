import { useRef } from 'react'
import type { ExpenseCategory } from '../types'
import type { CategoryBreakdown, MemberBalance } from '../lib/calculations'
import type { Member, Transfer } from '../types'
import { formatCurrency } from '../lib/utils'
import { CATEGORY_LABELS } from '../types'
import { PieChart, FileDown } from 'lucide-react'

const CATEGORY_EMOJIS: Record<ExpenseCategory, string> = {
  comida: '\u{1F354}',
  super: '\u{1F6D2}',
  nafta: '\u26FD',
  alquiler: '\u{1F3E0}',
  salida: '\u{1F37B}',
  otro: '\u{1F4E6}',
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  comida: '#F59E0B',
  super: '#6366F1',
  nafta: '#EF4444',
  alquiler: '#10B981',
  salida: '#EC4899',
  otro: '#64748B',
}

interface Props {
  totalExpenses: number
  perPerson: number
  categoryBreakdown: CategoryBreakdown[]
  memberCount: number
  groupName?: string
  members?: Member[]
  memberBalances?: MemberBalance[]
  transfers?: Transfer[]
}

export default function SummaryTab({
  totalExpenses,
  perPerson,
  categoryBreakdown,
  memberCount,
  groupName,
  members,
  memberBalances,
  transfers,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  const handleExportPDF = () => {
    const memberMap = members ? new Map(members.map((m) => [m.id, m])) : new Map()

    const balanceRows = (memberBalances || [])
      .sort((a, b) => b.net - a.net)
      .map((b) => {
        const m = memberMap.get(b.memberId)
        const sign = b.net >= 0 ? '+' : ''
        return `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee">${m?.name || '?'}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(b.totalPaid)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(b.totalOwed)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:${b.net >= 0 ? '#10B981' : '#EF4444'};font-weight:bold">${sign}${formatCurrency(b.net)}</td>
        </tr>`
      })
      .join('')

    const transferRows = (transfers || [])
      .map((t) => {
        const from = memberMap.get(t.from)
        const to = memberMap.get(t.to)
        return `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee">${from?.name || '?'}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">&rarr;</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee">${to?.name || '?'}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:#F59E0B">${formatCurrency(t.amount)}</td>
        </tr>`
      })
      .join('')

    const catRows = categoryBreakdown
      .map(
        (c) =>
          `<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #eee">${CATEGORY_EMOJIS[c.category]} ${CATEGORY_LABELS[c.category]}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(c.total)}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${c.percentage}%</td>
            <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${c.count} gastos</td>
          </tr>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Resumen - ${groupName || 'Divvy'}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;max-width:700px;margin:0 auto;padding:24px;color:#1a1a2e}
  h1{color:#7C3AED;margin-bottom:4px}
  h2{color:#333;margin-top:28px;border-bottom:2px solid #7C3AED;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{padding:8px 12px;text-align:left;background:#f8f9fa;border-bottom:2px solid #ddd;font-size:13px}
  .stats{display:flex;gap:16px;margin:16px 0}
  .stat-card{flex:1;background:#f8f9fa;border-radius:12px;padding:16px;text-align:center}
  .stat-value{font-size:24px;font-weight:900;color:#1a1a2e}
  .stat-label{font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px}
  .footer{margin-top:32px;text-align:center;color:#999;font-size:12px}
  @media print{body{padding:0}}
</style></head><body>
<h1>${groupName || 'Divvy'}</h1>
<p style="color:#666">Resumen generado el ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

<div class="stats">
  <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${formatCurrency(totalExpenses)}</div></div>
  <div class="stat-card"><div class="stat-label">Por persona</div><div class="stat-value">${formatCurrency(perPerson)}</div><div style="color:#666;font-size:12px">${memberCount} personas</div></div>
</div>

${balanceRows ? `<h2>Balances</h2>
<table><thead><tr><th>Persona</th><th style="text-align:right">Pago</th><th style="text-align:right">Le toca</th><th style="text-align:right">Balance</th></tr></thead><tbody>${balanceRows}</tbody></table>` : ''}

${transferRows ? `<h2>Transferencias para saldar</h2>
<table><thead><tr><th>De</th><th></th><th>A</th><th style="text-align:right">Monto</th></tr></thead><tbody>${transferRows}</tbody></table>` : ''}

<h2>Gastos por categoria</h2>
<table><thead><tr><th>Categoria</th><th style="text-align:right">Total</th><th style="text-align:right">%</th><th style="text-align:right">Cantidad</th></tr></thead><tbody>${catRows}</tbody></table>

<div class="footer">Generado con Divvy</div>
</body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 500)
    }
  }

  if (totalExpenses === 0) {
    return (
      <div className="text-center py-20">
        <PieChart size={52} className="mx-auto mb-4 text-text-muted opacity-30" />
        <p className="font-medium text-text-secondary text-lg">Resumen por categoria</p>
        <p className="text-sm text-text-muted mt-1">Se completara con datos de gastos</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4 animate-[fadeInUp_0.35s_ease-out_both]">
          <p className="text-xs text-text-muted uppercase tracking-wider">Total</p>
          <p className="text-xl font-black text-text mt-1 tabular-nums">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="glass rounded-2xl p-4 animate-[fadeInUp_0.35s_ease-out_0.06s_both]">
          <p className="text-xs text-text-muted uppercase tracking-wider">Por persona</p>
          <p className="text-xl font-black text-text mt-1 tabular-nums">{formatCurrency(perPerson)}</p>
          <p className="text-xs text-text-muted tabular-nums">{memberCount} personas</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Por categoria</h3>
        {categoryBreakdown.map((cat, index) => (
          <div
            key={cat.category}
            className="glass rounded-2xl p-3 animate-[fadeInUp_0.35s_ease-out_both]"
            style={{ animationDelay: `${(index + 2) * 0.06}s` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{CATEGORY_EMOJIS[cat.category]}</span>
                <span className="font-medium text-sm">{CATEGORY_LABELS[cat.category]}</span>
                <span className="text-xs text-text-muted">({cat.count})</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm tabular-nums">{formatCurrency(cat.total)}</span>
                <span className="text-xs text-text-muted ml-1 tabular-nums">{cat.percentage}%</span>
              </div>
            </div>
            <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${cat.percentage}%`,
                  background: `linear-gradient(90deg, ${CATEGORY_COLORS[cat.category]}, ${CATEGORY_COLORS[cat.category]}dd)`,
                  boxShadow: `0 0 8px ${CATEGORY_COLORS[cat.category]}66`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Export PDF button */}
      <button
        onClick={handleExportPDF}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 glass glass-hover rounded-2xl text-text-secondary hover:text-text btn-press"
      >
        <FileDown size={18} />
        Exportar resumen (PDF)
      </button>
    </div>
  )
}
