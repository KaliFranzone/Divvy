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

  // Sync settled state when transfers change (remove stale entries)
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
      <div className="text-center py-16">
        <Scale size={48} className="mx-auto mb-3 text-text-muted opacity-40" />
        <p className="font-medium text-text-secondary">Sin balances</p>
        <p className="text-sm text-text-muted">Agrega gastos para ver quien le debe a quien</p>
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
          .map((balance) => {
            const member = memberMap.get(balance.memberId)
            if (!member) return null
            const isPositive = balance.net >= 0
            const barWidth = Math.max((Math.abs(balance.net) / maxAbs) * 100, 2)

            return (
              <div key={balance.memberId} className="bg-bg-card border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: member.avatar_color }}
                    />
                    <span className="font-medium text-sm">{member.name}</span>
                  </div>
                  <span className={`font-bold text-sm ${isPositive ? 'text-success' : 'text-danger'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(balance.net)}
                  </span>
                </div>
                <div className="h-2 bg-bg-input rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isPositive ? 'bg-success' : 'bg-danger'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-text-muted">
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
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
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
                  className={`flex items-center gap-3 bg-bg-card border rounded-xl p-3 cursor-pointer transition-all ${
                    isSettled ? 'border-success/30 opacity-60' : 'border-border hover:border-border-light'
                  }`}
                >
                  {/* Settled toggle */}
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
                    <span className={`font-bold text-sm ${isSettled ? 'text-text-muted line-through' : 'text-accent'}`}>
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
