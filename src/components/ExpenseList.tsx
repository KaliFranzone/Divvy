import type { Expense, Member, ExpenseCategory } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'
import { Receipt } from 'lucide-react'

const CATEGORY_EMOJIS: Record<ExpenseCategory, string> = {
  comida: '🍔',
  super: '🛒',
  nafta: '⛽',
  alquiler: '🏠',
  salida: '🍻',
  otro: '📦',
}

interface Props {
  expenses: Expense[]
  members: Member[]
  splitCounts: Map<string, number>  // expense_id -> number of people split between
}

export default function ExpenseList({ expenses, members, splitCounts }: Props) {
  const memberMap = new Map(members.map((m) => [m.id, m]))

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16">
        <Receipt size={48} className="mx-auto mb-3 text-text-muted opacity-40" />
        <p className="font-medium text-text-secondary">No hay gastos todavía</p>
        <p className="text-sm text-text-muted">Tocá el botón + para cargar el primero</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense) => {
        const payer = memberMap.get(expense.paid_by)
        const splitCount = splitCounts.get(expense.id) || 0
        const splitLabel = splitCount === members.length ? 'Todos' : `${splitCount} personas`
        const dateStr = formatDate(expense.created_at)
        // Extract just the date part (e.g. "15 mar")
        const shortDate = dateStr.split(',')[0] || dateStr

        return (
          <div
            key={expense.id}
            className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3 hover:bg-bg-card-hover transition-colors"
          >
            {/* Category emoji */}
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-bg-input text-lg shrink-0">
              {CATEGORY_EMOJIS[expense.category]}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text truncate">{expense.description}</p>
              <p className="text-xs text-text-muted">
                {payer?.name || '?'} pagó · {splitLabel} · {shortDate}
              </p>
            </div>

            {/* Amount */}
            <p className="font-bold text-text shrink-0">{formatCurrency(expense.amount)}</p>
          </div>
        )
      })}
    </div>
  )
}
