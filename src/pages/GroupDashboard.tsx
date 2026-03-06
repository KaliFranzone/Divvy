import { useParams, useNavigate } from 'react-router-dom'
import { Receipt, Scale, PieChart, Plus, Users, Loader2, Share2 } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import { calculateDashboard } from '../lib/calculations'
import type { Group, Member, Expense, ExpenseSplit } from '../types'
import { getMemberKey } from './JoinGroup'
import AddExpenseModal from '../components/AddExpenseModal'
import ExpenseList from '../components/ExpenseList'
import BalancesTab from '../components/BalancesTab'
import SummaryTab from '../components/SummaryTab'
import { useToast } from '../components/Toast'

type Tab = 'expenses' | 'balances' | 'summary'

export default function GroupDashboard() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('expenses')
  const [loading, setLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const prevExpenseCountRef = useRef(0)

  const loadData = useCallback(async () => {
    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', code!.toUpperCase())
      .single()

    if (!groupData) {
      navigate('/', { replace: true })
      return
    }

    setGroup(groupData)

    const savedMemberId = localStorage.getItem(getMemberKey(groupData.id))
    if (!savedMemberId) {
      navigate(`/group/${code}`, { replace: true })
      return
    }

    const [membersRes, expensesRes, splitsRes] = await Promise.all([
      supabase
        .from('members')
        .select('*')
        .eq('group_id', groupData.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('expenses')
        .select('*')
        .eq('group_id', groupData.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('expense_splits')
        .select('*, expenses!inner(group_id)')
        .eq('expenses.group_id', groupData.id),
    ])

    const membersData = membersRes.data || []
    const expensesData = expensesRes.data || []
    setMembers(membersData)
    setExpenses(expensesData)
    setSplits((splitsRes.data || []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      expense_id: s.expense_id as string,
      member_id: s.member_id as string,
      amount: s.amount as number,
    })))

    const me = membersData.find((m) => m.id === savedMemberId)
    if (!me) {
      localStorage.removeItem(getMemberKey(groupData.id))
      navigate(`/group/${code}`, { replace: true })
      return
    }

    setCurrentMember(me)
    setLoading(false)

    // Show toast for new expenses from other members
    if (prevExpenseCountRef.current > 0 && expensesData.length > prevExpenseCountRef.current) {
      const newest = expensesData[0]
      if (newest && newest.paid_by !== savedMemberId) {
        const payer = membersData.find((m) => m.id === newest.paid_by)
        showToast(`${payer?.name || 'Alguien'} agrego: ${newest.description}`, 'info')
      }
    }
    prevExpenseCountRef.current = expensesData.length
  }, [code, navigate, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime subscriptions
  useEffect(() => {
    if (!group) return

    const channel = supabase
      .channel(`group-${group.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${group.id}` },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_splits' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `group_id=eq.${group.id}` },
        () => loadData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group, loadData])

  const dashboard = calculateDashboard(expenses, splits, members)

  const splitCounts = new Map<string, number>()
  for (const s of splits) {
    splitCounts.set(s.expense_id, (splitCounts.get(s.expense_id) || 0) + 1)
  }

  // Get split member IDs for editing expense
  const getExpenseSplitMemberIds = (expenseId: string): string[] => {
    return splits.filter((s) => s.expense_id === expenseId).map((s) => s.member_id)
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowAddExpense(true)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/group/${code}`
    if (navigator.share) {
      try {
        await navigator.share({ title: group?.name || 'Divvy', text: `Unite a ${group?.name} en Divvy`, url })
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url)
      showToast('Link copiado al portapapeles', 'success')
    }
  }

  const formatDates = () => {
    if (!group?.start_date) return null
    const start = new Date(group.start_date + 'T12:00:00')
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    const s = start.toLocaleDateString('es-AR', opts)
    if (!group.end_date) return s
    const end = new Date(group.end_date + 'T12:00:00')
    const e = end.toLocaleDateString('es-AR', opts)
    return `${s} \u2013 ${e}`
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'expenses', label: 'Gastos', icon: <Receipt size={16} /> },
    { key: 'balances', label: 'Balances', icon: <Scale size={16} /> },
    { key: 'summary', label: 'Resumen', icon: <PieChart size={16} /> },
  ]

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-bg pb-20">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="max-w-lg mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black italic bg-gradient-to-r from-primary-light to-secondary bg-clip-text text-transparent">
              {group?.name || 'Divvy'}
            </h1>
            <p className="text-text-secondary text-sm">
              {[group?.destination, formatDates()].filter(Boolean).join(' \u00B7 ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-9 h-9 bg-bg-card border border-border rounded-full text-text-secondary hover:text-text transition-colors"
              title="Compartir grupo"
            >
              <Share2 size={14} />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card border border-border rounded-full text-sm text-text-secondary hover:text-text transition-colors">
              <Users size={14} />
              {members.length}
            </button>
          </div>
        </div>
      </header>

      {/* Total card */}
      <div className="px-4 mb-4">
        <div className="max-w-lg mx-auto bg-gradient-to-br from-bg-card to-[#1a1f35] border border-border rounded-2xl p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Gasto total del grupo</p>
          <p className="text-3xl font-black text-text">{formatCurrency(dashboard.totalExpenses)}</p>
          <p className="text-text-muted text-sm mt-1">
            &asymp; {formatCurrency(dashboard.perPerson)} por persona
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="max-w-lg mx-auto flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-primary/20 text-primary-light border border-primary/30'
                  : 'bg-bg-card text-text-secondary border border-border hover:border-border-light'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4">
        {activeTab === 'expenses' && currentMember && (
          <ExpenseList
            expenses={expenses}
            members={members}
            splitCounts={splitCounts}
            currentMemberId={currentMember.id}
            onEdit={handleEdit}
            onDeleted={() => loadData()}
          />
        )}
        {activeTab === 'balances' && group && (
          <BalancesTab
            memberBalances={dashboard.memberBalances}
            transfers={dashboard.transfers}
            members={members}
            groupId={group.id}
          />
        )}
        {activeTab === 'summary' && (
          <SummaryTab
            totalExpenses={dashboard.totalExpenses}
            perPerson={dashboard.perPerson}
            categoryBreakdown={dashboard.categoryBreakdown}
            memberCount={members.length}
            groupName={group?.name}
            members={members}
            memberBalances={dashboard.memberBalances}
            transfers={dashboard.transfers}
          />
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <button
          onClick={() => { setEditingExpense(null); setShowAddExpense(true) }}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30 text-white hover:scale-105 transition-transform"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Add/Edit expense modal */}
      {showAddExpense && group && currentMember && (
        <AddExpenseModal
          groupId={group.id}
          members={members}
          currentMemberId={currentMember.id}
          onClose={() => { setShowAddExpense(false); setEditingExpense(null) }}
          onAdded={() => loadData()}
          editingExpense={editingExpense}
          editingSplitMemberIds={editingExpense ? getExpenseSplitMemberIds(editingExpense.id) : undefined}
        />
      )}
    </div>
  )
}
