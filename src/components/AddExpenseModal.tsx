import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { pesosToCents } from '../lib/utils'
import type { Member, ExpenseCategory } from '../types'
import { CATEGORY_LABELS } from '../types'

const CATEGORY_EMOJIS: Record<ExpenseCategory, string> = {
  comida: '🍔',
  super: '🛒',
  nafta: '⛽',
  alquiler: '🏠',
  salida: '🍻',
  otro: '📦',
}

interface Props {
  groupId: string
  members: Member[]
  currentMemberId: string
  onClose: () => void
  onAdded: () => void
}

export default function AddExpenseModal({ groupId, members, currentMemberId, onClose, onAdded }: Props) {
  const [phase, setPhase] = useState<'entering' | 'visible' | 'leaving'>('entering')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('comida')
  const [paidBy, setPaidBy] = useState(currentMemberId)
  const [splitBetween, setSplitBetween] = useState<string[]>(members.map((m) => m.id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('visible'))
    })
  }, [])

  const handleClose = () => {
    setPhase('leaving')
    setTimeout(onClose, 300)
  }

  const toggleMember = (id: string) => {
    setSplitBetween((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSplitBetween(
      splitBetween.length === members.length ? [] : members.map((m) => m.id)
    )
  }

  const getMemberLabel = (id: string) => {
    if (id === currentMemberId) return 'Vos'
    return members.find((m) => m.id === id)?.name || '?'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseFloat(amount)
    if (!description.trim() || !amountNum || amountNum <= 0 || splitBetween.length === 0 || saving) return

    setSaving(true)
    setError('')

    const amountCents = pesosToCents(amountNum)

    const { data: expense, error: expError } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        description: description.trim(),
        amount: amountCents,
        paid_by: paidBy,
        category,
      })
      .select()
      .single()

    if (expError || !expense) {
      setError('Error al guardar el gasto.')
      setSaving(false)
      return
    }

    const splitAmount = Math.floor(amountCents / splitBetween.length)
    const remainder = amountCents - splitAmount * splitBetween.length

    const splitsToInsert = splitBetween.map((memberId, idx) => ({
      expense_id: expense.id,
      member_id: memberId,
      amount: splitAmount + (idx < remainder ? 1 : 0),
    }))

    const { error: splitError } = await supabase
      .from('expense_splits')
      .insert(splitsToInsert)

    if (splitError) {
      setError('Gasto guardado pero hubo error en la división.')
      setSaving(false)
      return
    }

    onAdded()
    handleClose()
  }

  const isVisible = phase === 'visible'
  const isLeaving = phase === 'leaving'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`relative w-full max-w-md bg-bg-card border-t border-border-light rounded-t-2xl max-h-[92dvh] overflow-y-auto transition-transform duration-300 ${isVisible && !isLeaving ? 'translate-y-0' : 'translate-y-full'} ease-[cubic-bezier(0.32,0.72,0,1)]`}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 bg-bg-card">
          <div className="w-10 h-1 rounded-full bg-border-light" />
        </div>

        <div className="px-5 pb-5">
          <h2 className="text-xl font-bold mb-5">Nuevo gasto</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Cena en la playa"
                maxLength={80}
                autoFocus
                className="w-full py-3 px-4 bg-bg-input border border-border-light rounded-xl text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Monto</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25000"
                  min="1"
                  step="1"
                  className="w-full py-3 px-4 bg-bg-input border border-border-light rounded-xl text-text text-lg font-semibold placeholder:text-text-muted placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Paid by */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Quién pagó</label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaidBy(m.id)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      paidBy === m.id
                        ? 'bg-text text-bg ring-1 ring-text'
                        : 'bg-bg-input text-text-secondary border border-border-light hover:border-text-muted'
                    }`}
                  >
                    {getMemberLabel(m.id)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Categoría</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      category === cat
                        ? 'bg-primary/20 text-primary-light ring-1 ring-primary/40'
                        : 'bg-bg-input text-text-secondary border border-border-light hover:border-text-muted'
                    }`}
                  >
                    <span>{CATEGORY_EMOJIS[cat]}</span>
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Split between */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Dividir entre</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    splitBetween.length === members.length
                      ? 'bg-success text-white ring-1 ring-success'
                      : 'bg-bg-input text-text-secondary border border-border-light hover:border-text-muted'
                  }`}
                >
                  Todos
                </button>
                {members.map((m) => {
                  const selected = splitBetween.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        selected
                          ? 'bg-success/20 text-success ring-1 ring-success/40'
                          : 'bg-bg-input text-text-muted border border-border-light hover:border-text-muted'
                      }`}
                    >
                      {getMemberLabel(m.id)}
                    </button>
                  )
                })}
              </div>
              {splitBetween.length > 0 && amount && parseFloat(amount) > 0 && (
                <p className="text-xs text-text-muted mt-1">
                  ${Math.round(parseFloat(amount) / splitBetween.length).toLocaleString('es-AR')} por persona
                </p>
              )}
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={!description.trim() || !amount || parseFloat(amount) <= 0 || splitBetween.length === 0 || saving}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 px-4 rounded-2xl transition-all text-base"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : null}
              {saving ? 'Guardando...' : 'Agregar gasto'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
