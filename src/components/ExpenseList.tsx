import { useState } from 'react'
import type { Expense, Member, ExpenseCategory } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'
import { Receipt, Pencil, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

const CATEGORY_EMOJIS: Record<ExpenseCategory, string> = {
  comida: '\u{1F354}',
  super: '\u{1F6D2}',
  nafta: '\u26FD',
  alquiler: '\u{1F3E0}',
  salida: '\u{1F37B}',
  otro: '\u{1F4E6}',
}

interface Props {
  expenses: Expense[]
  members: Member[]
  splitCounts: Map<string, number>
  currentMemberId: string
  onEdit: (expense: Expense) => void
  onDeleted: () => void
}

export default function ExpenseList({ expenses, members, splitCounts, currentMemberId, onEdit, onDeleted }: Props) {
  const { showToast } = useToast()
  const memberMap = new Map(members.map((m) => [m.id, m]))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleDelete = async (expenseId: string) => {
    if (confirmDeleteId !== expenseId) {
      setConfirmDeleteId(expenseId)
      return
    }

    setDeletingId(expenseId)
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
    if (error) {
      showToast('Error al eliminar el gasto', 'error')
    } else {
      showToast('Gasto eliminado', 'success')
      onDeleted()
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
    setExpandedId(null)
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-20">
        <Receipt size={52} className="mx-auto mb-4 text-text-muted opacity-30" />
        <p className="font-medium text-text-secondary text-lg">No hay gastos todavia</p>
        <p className="text-sm text-text-muted mt-1">Toca el boton + para cargar el primero</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense, index) => {
        const payer = memberMap.get(expense.paid_by)
        const splitCount = splitCounts.get(expense.id) || 0
        const splitLabel = splitCount === members.length ? 'Todos' : `${splitCount} personas`
        const dateStr = formatDate(expense.created_at)
        const shortDate = dateStr.split(',')[0] || dateStr
        const isExpanded = expandedId === expense.id
        const isOwner = expense.paid_by === currentMemberId

        return (
          <div
            key={expense.id}
            style={{ animationDelay: `${Math.min(index * 0.04, 0.4)}s` }}
            className="animate-[fadeInUp_0.35s_ease-out_both]"
          >
            <div
              onClick={() => setExpandedId(isExpanded ? null : expense.id)}
              className={`flex items-center gap-3 glass glass-hover rounded-2xl p-3 cursor-pointer ${
                isExpanded ? 'border-primary/20 bg-white/[0.06]' : ''
              }`}
            >
              {/* Category emoji */}
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.04] text-lg shrink-0">
                {CATEGORY_EMOJIS[expense.category]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text truncate">{expense.description}</p>
                <p className="text-xs text-text-muted">
                  {payer?.name || '?'} pago &middot; {splitLabel} &middot; {shortDate}
                </p>
              </div>

              {/* Amount */}
              <p className="font-bold text-text shrink-0 tabular-nums">{formatCurrency(expense.amount)}</p>
            </div>

            {/* Action buttons */}
            {isExpanded && isOwner && (
              <div className="flex gap-2 mt-1.5 pl-[52px] animate-[fadeInUp_0.2s_ease-out_both]">
                <button
                  onClick={() => { onEdit(expense); setExpandedId(null) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-light bg-primary/10 border border-primary/15 rounded-lg hover:bg-primary/20 transition-colors btn-press"
                >
                  <Pencil size={12} />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(expense.id)}
                  disabled={deletingId === expense.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors btn-press ${
                    confirmDeleteId === expense.id
                      ? 'bg-danger text-white glow-danger'
                      : 'text-danger bg-danger/10 border border-danger/15 hover:bg-danger/20'
                  }`}
                >
                  {deletingId === expense.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                  {confirmDeleteId === expense.id ? 'Confirmar' : 'Eliminar'}
                </button>
              </div>
            )}
            {isExpanded && !isOwner && (
              <p className="text-xs text-text-muted mt-1.5 pl-[52px] animate-[fadeInUp_0.2s_ease-out_both]">
                Solo {payer?.name} puede editar este gasto
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
