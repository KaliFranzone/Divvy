import type { Expense, ExpenseSplit, Member, ExpenseCategory, Transfer } from '../types'

export interface MemberBalance {
  memberId: string
  totalPaid: number    // centavos: cuánto pagó en total
  totalOwed: number    // centavos: cuánto le corresponde pagar (su parte de los splits)
  net: number          // centavos: positivo = le deben, negativo = debe
}

export interface CategoryBreakdown {
  category: ExpenseCategory
  total: number        // centavos
  count: number
  percentage: number   // 0-100
}

export interface DashboardCalculations {
  totalExpenses: number       // centavos
  perPerson: number           // centavos
  memberBalances: MemberBalance[]
  transfers: Transfer[]
  categoryBreakdown: CategoryBreakdown[]
}

export function calculateDashboard(
  expenses: Expense[],
  splits: ExpenseSplit[],
  members: Member[]
): DashboardCalculations {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const perPerson = members.length > 0 ? Math.round(totalExpenses / members.length) : 0

  // Build a map of expense_id -> splits
  const splitsByExpense = new Map<string, ExpenseSplit[]>()
  for (const s of splits) {
    const arr = splitsByExpense.get(s.expense_id) || []
    arr.push(s)
    splitsByExpense.set(s.expense_id, arr)
  }

  // Calculate balances
  const paidMap = new Map<string, number>()   // member_id -> total paid
  const owedMap = new Map<string, number>()   // member_id -> total owed (splits)

  for (const m of members) {
    paidMap.set(m.id, 0)
    owedMap.set(m.id, 0)
  }

  for (const expense of expenses) {
    paidMap.set(expense.paid_by, (paidMap.get(expense.paid_by) || 0) + expense.amount)
  }

  for (const split of splits) {
    owedMap.set(split.member_id, (owedMap.get(split.member_id) || 0) + split.amount)
  }

  const memberBalances: MemberBalance[] = members.map((m) => {
    const totalPaid = paidMap.get(m.id) || 0
    const totalOwed = owedMap.get(m.id) || 0
    return {
      memberId: m.id,
      totalPaid,
      totalOwed,
      net: totalPaid - totalOwed,
    }
  })

  // Calculate minimum transfers
  const netBalances = new Map<string, number>()
  for (const mb of memberBalances) {
    netBalances.set(mb.memberId, mb.net)
  }
  const transfers = calculateMinTransfers(netBalances)

  // Category breakdown
  const catMap = new Map<ExpenseCategory, { total: number; count: number }>()
  for (const expense of expenses) {
    const existing = catMap.get(expense.category) || { total: 0, count: 0 }
    existing.total += expense.amount
    existing.count += 1
    catMap.set(expense.category, existing)
  }

  const categoryBreakdown: CategoryBreakdown[] = Array.from(catMap.entries())
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  return { totalExpenses, perPerson, memberBalances, transfers, categoryBreakdown }
}

function calculateMinTransfers(balances: Map<string, number>): Transfer[] {
  const debtors: { id: string; amount: number }[] = []
  const creditors: { id: string; amount: number }[] = []

  balances.forEach((balance, id) => {
    if (balance < -1) {
      debtors.push({ id, amount: -balance })
    } else if (balance > 1) {
      creditors.push({ id, amount: balance })
    }
  })

  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const transferAmount = Math.min(debtors[i].amount, creditors[j].amount)
    if (transferAmount > 1) {
      transfers.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: Math.round(transferAmount),
      })
    }
    debtors[i].amount -= transferAmount
    creditors[j].amount -= transferAmount

    if (debtors[i].amount < 1) i++
    if (creditors[j].amount < 1) j++
  }

  return transfers
}
