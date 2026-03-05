import type { Member, Transfer } from '../types'
import type { MemberBalance } from '../lib/calculations'
import { formatCurrency } from '../lib/utils'
import { Scale, ArrowRight } from 'lucide-react'

interface Props {
  memberBalances: MemberBalance[]
  transfers: Transfer[]
  members: Member[]
}

export default function BalancesTab({ memberBalances, transfers, members }: Props) {
  const memberMap = new Map(members.map((m) => [m.id, m]))

  if (memberBalances.length === 0 || memberBalances.every((b) => b.net === 0)) {
    return (
      <div className="text-center py-16">
        <Scale size={48} className="mx-auto mb-3 text-text-muted opacity-40" />
        <p className="font-medium text-text-secondary">Sin balances</p>
        <p className="text-sm text-text-muted">Agregá gastos para ver quién le debe a quién</p>
      </div>
    )
  }

  const maxAbs = Math.max(...memberBalances.map((b) => Math.abs(b.net)), 1)

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
                  <span>Pagó {formatCurrency(balance.totalPaid)}</span>
                  <span>Le toca {formatCurrency(balance.totalOwed)}</span>
                </div>
              </div>
            )
          })}
      </div>

      {/* Transfers */}
      {transfers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Transferencias para saldar ({transfers.length})
          </h3>
          <div className="space-y-2">
            {transfers.map((t, idx) => {
              const fromMember = memberMap.get(t.from)
              const toMember = memberMap.get(t.to)
              if (!fromMember || !toMember) return null

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3"
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: fromMember.avatar_color }}
                    />
                    <span className="font-medium text-sm truncate">{fromMember.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ArrowRight size={14} className="text-text-muted" />
                    <span className="font-bold text-accent text-sm">{formatCurrency(t.amount)}</span>
                    <ArrowRight size={14} className="text-text-muted" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className="font-medium text-sm truncate">{toMember.name}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: toMember.avatar_color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
