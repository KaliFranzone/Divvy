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
      <div className="text-center py-16">
        <Receipt size={48} className="mx-auto mb-3 text-text-muted opacity-40" />
        <p className="font-medium text-text-secondary">No hay gastos todavia</p>
        <p className="text-sm text-text-muted">Toca el boton + para cargar el primero</p>
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
        const shortDate = dateStr.split(',')[0] || dateStr
        const isExpanded = expandedId === expense.id
        const isOwner = expense.paid_by === currentMemberId

        return (
          <div key={expense.id}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : expense.id)}
              className={`flex items-center gap-3 bg-bg-card border rounded-xl p-3 transition-colors cursor-pointer ${
                isExpanded ? 'border-primary/30 bg-bg-card-hover' : 'border-border hover:bg-bg-card-hover'
              }`}
            >
              {/* Category emoji */}
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-bg-input text-lg shrink-0">
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
              <p className="font-bold text-text shrink-0">{formatCurrency(expense.amount)}</p>
            </div>

            {/* Action buttons */}
            {isExpanded && isOwner && (
              <div className="flex gap-2 mt-1 ml-13 pl-[52px]">
                <button
                  onClick={() => { onEdit(expense); setExpandedId(null) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-light bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <Pencil size={12} />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(expense.id)}
                  disabled={deletingId === expense.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    confirmDeleteId === expense.id
                      ? 'bg-danger text-white'
                      : 'text-danger bg-danger/10 border border-danger/20 hover:bg-danger/20'
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
              <p className="text-xs text-text-muted mt-1 pl-[52px]">
                Solo {payer?.name} puede editar este gasto
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
