import type { Member, Expense, ExpenseSplit, Transfer } from '../types'
import type { MemberBalance } from '../lib/calculations'
import { formatCurrency } from '../lib/utils'
import { CATEGORY_LABELS, type ExpenseCategory } from '../types'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Circle,
  ShoppingCart,
  UtensilsCrossed,
  Fuel,
  Home,
  PartyPopper,
  Receipt,
  User,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useToast } from './Toast'

interface Props {
  currentMember: Member
  members: Member[]
  expenses: Expense[]
  splits: ExpenseSplit[]
  memberBalances: MemberBalance[]
  transfers: Transfer[]
  groupId: string
}

const CATEGORY_ICON_MAP: Record<ExpenseCategory, React.ReactNode> = {
  comida: <UtensilsCrossed size={16} />,
  super: <ShoppingCart size={16} />,
  nafta: <Fuel size={16} />,
  alquiler: <Home size={16} />,
  salida: <PartyPopper size={16} />,
  otro: <Receipt size={16} />,
}

function getSettledKey(groupId: string) {
  return `divvy_settled_${groupId}`
}

function loadSettled(groupId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getSettledKey(groupId))
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveSettled(groupId: string, settled: Set<string>) {
  localStorage.setItem(getSettledKey(groupId), JSON.stringify([...settled]))
}

function transferKey(t: Transfer): string {
  return `${t.from}->${t.to}:${t.amount}`
}

export default function ProfileTab({
  currentMember,
  members,
  expenses,
  splits,
  memberBalances,
  transfers,
  groupId,
}: Props) {
  const { showToast } = useToast()
  const memberMap = new Map(members.map((m) => [m.id, m]))
  const [settled, setSettled] = useState<Set<string>>(() => loadSettled(groupId))

  useEffect(() => {
    const validKeys = new Set(transfers.map(transferKey))
    const newSettled = new Set([...settled].filter((k) => validKeys.has(k)))
    if (newSettled.size !== settled.size) {
      setSettled(newSettled)
      saveSettled(groupId, newSettled)
    }
  }, [transfers, groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSettled = (t: Transfer) => {
    const key = transferKey(t)
    const next = new Set(settled)
    if (next.has(key)) {
      next.delete(key)
      showToast('Transferencia marcada como pendiente', 'info')
    } else {
      next.add(key)
      const from = memberMap.get(t.from)
      const to = memberMap.get(t.to)
      showToast(`${from?.name} le pago a ${to?.name}`, 'success')
    }
    setSettled(next)
    saveSettled(groupId, next)
  }

  const myBalance = memberBalances.find((b) => b.memberId === currentMember.id)
  const totalPaid = myBalance?.totalPaid || 0
  const totalOwed = myBalance?.totalOwed || 0
  const net = myBalance?.net || 0

  // My expenses (what I paid for)
  const myExpenses = expenses.filter((e) => e.paid_by === currentMember.id)

  // My transfers (where I'm involved)
  const myTransfers = transfers.filter(
    (t) => t.from === currentMember.id || t.to === currentMember.id
  )

  // Category breakdown for my expenses
  const myCategoryTotals = new Map<ExpenseCategory, number>()
  for (const e of myExpenses) {
    myCategoryTotals.set(e.category, (myCategoryTotals.get(e.category) || 0) + e.amount)
  }

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="glass rounded-2xl p-5 text-center animate-[fadeInUp_0.35s_ease-out_both]">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white shadow-lg"
          style={{ backgroundColor: currentMember.avatar_color }}
        >
          {currentMember.name.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-bold text-text">{currentMember.name}</h2>
        <p className="text-text-muted text-sm mt-1">
          {myExpenses.length} {myExpenses.length === 1 ? 'gasto cargado' : 'gastos cargados'}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2 animate-[fadeInUp_0.35s_ease-out_0.05s_both]">
        <div className="glass rounded-2xl p-3 text-center">
          <Wallet size={18} className="mx-auto mb-1.5 text-primary-light" />
          <p className="text-xs text-text-muted mb-0.5">Pagaste</p>
          <p className="font-bold text-sm tabular-nums text-text">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <Receipt size={18} className="mx-auto mb-1.5 text-secondary" />
          <p className="text-xs text-text-muted mb-0.5">Te toca</p>
          <p className="font-bold text-sm tabular-nums text-text">{formatCurrency(totalOwed)}</p>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          {net >= 0 ? (
            <TrendingUp size={18} className="mx-auto mb-1.5 text-success" />
          ) : (
            <TrendingDown size={18} className="mx-auto mb-1.5 text-danger" />
          )}
          <p className="text-xs text-text-muted mb-0.5">Balance</p>
          <p className={`font-bold text-sm tabular-nums ${net >= 0 ? 'text-success' : 'text-danger'}`}>
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </p>
        </div>
      </div>

      {/* My transfers */}
      {myTransfers.length > 0 && (
        <div className="space-y-3 animate-[fadeInUp_0.35s_ease-out_0.1s_both]">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Mis transferencias
          </h3>
          <div className="space-y-2">
            {myTransfers.map((t, idx) => {
              const fromMember = memberMap.get(t.from)
              const toMember = memberMap.get(t.to)
              if (!fromMember || !toMember) return null
              const isSettled = settled.has(transferKey(t))
              const iOwe = t.from === currentMember.id

              return (
                <div
                  key={idx}
                  onClick={() => toggleSettled(t)}
                  className={`glass rounded-2xl p-3 cursor-pointer transition-all btn-press ${
                    isSettled ? 'border-success/20 opacity-60' : 'glass-hover'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {isSettled ? (
                        <CheckCircle2 size={20} className="text-success" />
                      ) : (
                        <Circle size={20} className="text-text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSettled ? 'line-through text-text-muted' : 'text-text'}`}>
                        {iOwe
                          ? `Le debes a ${toMember.name}`
                          : `${fromMember.name} te debe`}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {isSettled ? 'Pagado' : 'Pendiente'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-bold tabular-nums ${isSettled ? 'text-text-muted line-through' : iOwe ? 'text-danger' : 'text-success'}`}>
                        {formatCurrency(t.amount)}
                      </span>
                      <ArrowRight size={14} className="text-text-muted" />
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: iOwe ? toMember.avatar_color : fromMember.avatar_color }}
                      >
                        {iOwe ? toMember.name.charAt(0) : fromMember.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-text-muted text-center">
            Toca una transferencia para marcarla como pagada
          </p>
        </div>
      )}

      {/* My expenses list */}
      {myExpenses.length > 0 ? (
        <div className="space-y-3 animate-[fadeInUp_0.35s_ease-out_0.15s_both]">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Gastos que cargaste ({myExpenses.length})
          </h3>
          <div className="space-y-2">
            {myExpenses.map((expense, idx) => {
              const splitCount = splits.filter((s) => s.expense_id === expense.id).length
              const date = new Date(expense.created_at)
              const dateStr = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

              return (
                <div
                  key={expense.id}
                  className="glass rounded-2xl p-3 flex items-center gap-3 animate-[fadeInUp_0.3s_ease-out_both]"
                  style={{ animationDelay: `${Math.min(idx * 0.04, 0.4)}s` }}
                >
                  <div className="w-9 h-9 rounded-xl glass flex items-center justify-center text-text-secondary shrink-0">
                    {CATEGORY_ICON_MAP[expense.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-text truncate">{expense.description}</p>
                    <p className="text-xs text-text-muted">
                      {CATEGORY_LABELS[expense.category]} · {splitCount > 0 ? `${splitCount} personas` : 'Todos'} · {dateStr}
                    </p>
                  </div>
                  <span className="font-bold text-sm tabular-nums text-text shrink-0">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 animate-[fadeInUp_0.35s_ease-out_0.1s_both]">
          <User size={44} className="mx-auto mb-3 text-text-muted opacity-30" />
          <p className="font-medium text-text-secondary">No cargaste gastos todavia</p>
          <p className="text-sm text-text-muted mt-1">Toca el boton + para cargar uno</p>
        </div>
      )}
    </div>
  )
}
