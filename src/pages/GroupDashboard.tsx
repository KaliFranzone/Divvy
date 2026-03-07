import { useParams, useNavigate } from 'react-router-dom'
import { Receipt, Scale, PieChart, Plus, Users, Share2, User, LogOut, Copy } from 'lucide-react'
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
import ProfileTab from '../components/ProfileTab'
import { useToast } from '../components/Toast'

type Tab = 'expenses' | 'profile' | 'balances' | 'summary'

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
    { key: 'expenses', label: 'Gastos', icon: <Receipt size={20} /> },
    { key: 'profile', label: 'Perfil', icon: <User size={20} /> },
    { key: 'balances', label: 'Balances', icon: <Scale size={20} /> },
    { key: 'summary', label: 'Resumen', icon: <PieChart size={20} /> },
  ]

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col pb-28">
        <header className="px-4 pt-6 pb-4">
          <div className="max-w-lg mx-auto">
            <div className="w-48 h-7 skeleton mb-2" />
            <div className="w-32 h-4 skeleton" />
          </div>
        </header>
        <div className="px-4 mb-4">
          <div className="max-w-lg mx-auto glass rounded-2xl p-4">
            <div className="w-24 h-3 skeleton mb-3" />
            <div className="w-36 h-8 skeleton mb-2" />
            <div className="w-28 h-3 skeleton" />
          </div>
        </div>
        <div className="px-4 max-w-lg mx-auto w-full space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 skeleton rounded-xl" />
              <div className="flex-1">
                <div className="w-32 h-4 skeleton mb-2" />
                <div className="w-24 h-3 skeleton" />
              </div>
              <div className="w-16 h-5 skeleton" />
            </div>
          ))}
        </div>
        {/* Bottom nav skeleton */}
        <nav className="bottom-nav">
          <div className="bottom-nav-bar">
            <div className="nav-fab opacity-50"><Plus size={28} /></div>
            <div className="max-w-lg mx-auto flex items-end px-2">
              <div className="flex flex-1 min-w-0">
                {[1, 2].map((i) => (
                  <div key={i} className="bottom-nav-item flex-1">
                    <div className="w-5 h-5 skeleton rounded" />
                    <div className="w-10 h-2 skeleton" />
                  </div>
                ))}
              </div>
              <div className="w-[72px] shrink-0" />
              <div className="flex flex-1 min-w-0">
                {[3, 4].map((i) => (
                  <div key={i} className="bottom-nav-item flex-1">
                    <div className="w-5 h-5 skeleton rounded" />
                    <div className="w-10 h-2 skeleton" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col pb-28">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 animate-[fadeInUp_0.4s_ease-out_both]">
        <div className="max-w-lg mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black italic bg-gradient-to-r from-primary-light to-secondary bg-clip-text text-transparent">
              {group?.name || 'Divvy'}
            </h1>
            <p className="text-text-secondary text-sm">
              {[group?.destination, formatDates()].filter(Boolean).join(' \u00B7 ')}
            </p>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(code!.toUpperCase())
                showToast('Código copiado', 'success')
              }}
              className="mt-1 flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
            >
              <span className="font-mono tracking-widest bg-white/[0.06] px-2 py-0.5 rounded-lg">{code?.toUpperCase()}</span>
              <Copy size={12} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-9 h-9 glass rounded-full text-text-secondary hover:text-text transition-colors btn-press"
              title="Compartir grupo"
            >
              <Share2 size={14} />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-sm text-text-secondary hover:text-text transition-colors">
              <Users size={14} />
              {members.length}
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-9 h-9 glass rounded-full text-text-secondary hover:text-danger transition-colors btn-press"
              title="Salir del grupo"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Total card */}
      <div className="px-4 mb-5 animate-[fadeInUp_0.4s_ease-out_0.05s_both]">
        <div className="max-w-lg mx-auto glass-strong rounded-2xl p-4 relative overflow-hidden">
          {/* Inner glow accent */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1 relative">Gasto total del grupo</p>
          <p className="text-3xl font-black text-text tabular-nums relative">{formatCurrency(dashboard.totalExpenses)}</p>
          <p className="text-text-muted text-sm mt-1 tabular-nums relative">
            &asymp; {formatCurrency(dashboard.perPerson)} por persona
          </p>
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
        {activeTab === 'profile' && currentMember && group && (
          <ProfileTab
            currentMember={currentMember}
            members={members}
            expenses={expenses}
            splits={splits}
            memberBalances={dashboard.memberBalances}
            transfers={dashboard.transfers}
            groupId={group.id}
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

      {/* Bottom Navigation Bar with integrated FAB */}
      <nav className="bottom-nav">
        <div className="bottom-nav-bar">
          {/* FAB - absolutely centered in the bar */}
          <button
            onClick={() => { setEditingExpense(null); setShowAddExpense(true) }}
            className="nav-fab"
          >
            <Plus size={28} />
          </button>

          <div className="max-w-lg mx-auto flex items-end px-2">
            {/* Left half - Gastos + Perfil */}
            <div className="flex flex-1 min-w-0">
              {tabs.slice(0, 2).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`bottom-nav-item flex-1 ${activeTab === tab.key ? 'active text-primary-light' : 'text-text-muted'}`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Center spacer for FAB */}
            <div className="w-[72px] shrink-0" />

            {/* Right half - Balances + Resumen */}
            <div className="flex flex-1 min-w-0">
              {tabs.slice(2).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`bottom-nav-item flex-1 ${activeTab === tab.key ? 'active text-primary-light' : 'text-text-muted'}`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

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
