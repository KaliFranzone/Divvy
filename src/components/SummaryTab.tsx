import type { ExpenseCategory } from '../types'
import type { CategoryBreakdown } from '../lib/calculations'
import { formatCurrency } from '../lib/utils'
import { CATEGORY_LABELS } from '../types'
import { PieChart } from 'lucide-react'

const CATEGORY_EMOJIS: Record<ExpenseCategory, string> = {
  comida: '🍔',
  super: '🛒',
  nafta: '⛽',
  alquiler: '🏠',
  salida: '🍻',
  otro: '📦',
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
}

export default function SummaryTab({ totalExpenses, perPerson, categoryBreakdown, memberCount }: Props) {
  if (totalExpenses === 0) {
    return (
      <div className="text-center py-16">
        <PieChart size={48} className="mx-auto mb-3 text-text-muted opacity-40" />
        <p className="font-medium text-text-secondary">Resumen por categoría</p>
        <p className="text-sm text-text-muted">Se completará con datos de gastos</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-text-muted uppercase tracking-wider">Total</p>
          <p className="text-xl font-black text-text mt-1">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-text-muted uppercase tracking-wider">Por persona</p>
          <p className="text-xl font-black text-text mt-1">{formatCurrency(perPerson)}</p>
          <p className="text-xs text-text-muted">{memberCount} personas</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Por categoría</h3>
        {categoryBreakdown.map((cat) => (
          <div key={cat.category} className="bg-bg-card border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{CATEGORY_EMOJIS[cat.category]}</span>
                <span className="font-medium text-sm">{CATEGORY_LABELS[cat.category]}</span>
                <span className="text-xs text-text-muted">({cat.count})</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm">{formatCurrency(cat.total)}</span>
                <span className="text-xs text-text-muted ml-1">{cat.percentage}%</span>
              </div>
            </div>
            <div className="h-2 bg-bg-input rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${cat.percentage}%`,
                  backgroundColor: CATEGORY_COLORS[cat.category],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
