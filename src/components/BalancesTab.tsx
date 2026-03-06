import { useState, useEffect } from 'react'
import type { Member, Transfer } from '../types'
import type { MemberBalance } from '../lib/calculations'
import { formatCurrency } from '../lib/utils'
import { Scale, ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { useToast } from './Toast'

interface Props {
  memberBalances: MemberBalance[]
  transfers: Transfer[]
  members: Member[]
  groupId: string
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

export default function BalancesTab({ memberBalances, transfers, members, groupId }: Props) {
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

  if (memberBalances.length === 0 || memberBalances.every((b) => b.net === 0)) {
    return (
      <div className="text-center py-20">
        <Scale size={52} className="mx-auto mb-4 text-text-muted opacity-30" />
        <p className="font-medium text-text-secondary text-lg">Sin balances</p>
        <p className="text-sm text-text-muted mt-1">Agrega gastos para ver quien le debe a quien</p>
      </div>
    )
  }

  const maxAbs = Math.max(...memberBalances.map((b) => Math.abs(b.net)), 1)
  const allSettled = transfers.length > 0 && transfers.every((t) => settled.has(transferKey(t)))

  return (
    <div className="space-y-6">
      {/* Balance bars */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Balance por persona</h3>
        {memberBalances
          .sort((a, b) => b.net - a.net)
          .map((balance, index) => {
            const member = memberMap.get(balance.memberId)
            if (!member) return null
            const isPositive = balance.net >= 0
            const barWidth = Math.max((Math.abs(balance.net) / maxAbs) * 100, 2)

            return (
              <div
                key={balance.memberId}
                className="glass rounded-2xl p-3 animate-[fadeInUp_0.35s_ease-out_both]"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: member.avatar_color }}
                    />
                    <span className="font-medium text-sm">{member.name}</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isPositive ? 'text-success' : 'text-danger'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(balance.net)}
                  </span>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${isPositive ? 'progress-bar-success' : 'progress-bar-danger'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-text-muted tabular-nums">
                  <span>Pago {formatCurrency(balance.totalPaid)}</span>
                  <span>Le toca {formatCurrency(balance.totalOwed)}</span>
                </div>
              </div>
            )
          })}
      </div>

      {/* Transfers */}
      {transfers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Transferencias para saldar ({transfers.length})
            </h3>
            {allSettled && (
              <span className="text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full glow-success">
                Todo saldado
              </span>
            )}
          </div>
          <div className="space-y-2">
            {transfers.map((t, idx) => {
              const fromMember = memberMap.get(t.from)
              const toMember = memberMap.get(t.to)
              if (!fromMember || !toMember) return null
              const isSettled = settled.has(transferKey(t))

              return (
                <div
                  key={idx}
                  onClick={() => toggleSettled(t)}
                  className={`flex items-center gap-3 glass rounded-2xl p-3 cursor-pointer transition-all btn-press animate-[fadeInUp_0.35s_ease-out_both] ${
                    isSettled ? 'border-success/20 opacity-60' : 'glass-hover'
                  }`}
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <div className="shrink-0">
                    {isSettled ? (
                      <CheckCircle2 size={20} className="text-success" />
                    ) : (
                      <Circle size={20} className="text-text-muted" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: fromMember.avatar_color }}
                    />
                    <span className={`font-medium text-sm truncate ${isSettled ? 'line-through' : ''}`}>
                      {fromMember.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ArrowRight size={14} className="text-text-muted" />
                    <span className={`font-bold text-sm tabular-nums ${isSettled ? 'text-text-muted line-through' : 'text-accent'}`}>
                      {formatCurrency(t.amount)}
                    </span>
                    <ArrowRight size={14} className="text-text-muted" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className={`font-medium text-sm truncate ${isSettled ? 'line-through' : ''}`}>
                      {toMember.name}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: toMember.avatar_color }}
                    />
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
    </div>
  )
}
