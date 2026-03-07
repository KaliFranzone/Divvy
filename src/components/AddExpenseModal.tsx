import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { pesosToCents } from '../lib/utils'
import type { Member, ExpenseCategory, Expense } from '../types'
import { CATEGORY_LABELS } from '../types'
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
  groupId: string
  members: Member[]
  currentMemberId: string
  onClose: () => void
  onAdded: () => void
  editingExpense?: Expense | null
  editingSplitMemberIds?: string[]
}

export default function AddExpenseModal({ groupId, members, currentMemberId, onClose, onAdded, editingExpense, editingSplitMemberIds }: Props) {
  const { showToast } = useToast()
  const [phase, setPhase] = useState<'entering' | 'visible' | 'leaving'>('entering')
  const [description, setDescription] = useState(editingExpense?.description || '')
  const [amount, setAmount] = useState(editingExpense ? String(editingExpense.amount / 100) : '')
  const [category, setCategory] = useState<ExpenseCategory>(editingExpense?.category || 'comida')
  const [paidBy, setPaidBy] = useState(editingExpense?.paid_by || currentMemberId)
  const [splitBetween, setSplitBetween] = useState<string[]>(
    editingSplitMemberIds || members.map((m) => m.id)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const sheetRef = useRef<HTMLDivElement>(null)
  const submitRef = useRef(false)

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

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!description.trim()) errors.description = 'Ingresa una descripcion'
    if (description.trim().length > 80) errors.description = 'Maximo 80 caracteres'

    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum)) errors.amount = 'Ingresa un monto'
    else if (amountNum <= 0) errors.amount = 'El monto debe ser mayor a 0'
    else if (amountNum > 99999999) errors.amount = 'Monto demasiado alto'

    if (splitBetween.length === 0) errors.split = 'Selecciona al menos una persona'

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitRef.current || saving) return
    if (!validate()) return

    submitRef.current = true
    setSaving(true)
    setError('')

    const amountCents = pesosToCents(parseFloat(amount))

    if (editingExpense) {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          description: description.trim(),
          amount: amountCents,
          paid_by: paidBy,
          category,
        })
        .eq('id', editingExpense.id)

      if (updateError) {
        setError('Error al actualizar el gasto.')
        setSaving(false)
        submitRef.current = false
        return
      }

      await supabase.from('expense_splits').delete().eq('expense_id', editingExpense.id)

      const splitAmount = Math.floor(amountCents / splitBetween.length)
      const remainder = amountCents - splitAmount * splitBetween.length
      const splitsToInsert = splitBetween.map((memberId, idx) => ({
        expense_id: editingExpense.id,
        member_id: memberId,
        amount: splitAmount + (idx < remainder ? 1 : 0),
      }))

      const { error: splitError } = await supabase.from('expense_splits').insert(splitsToInsert)
      if (splitError) {
        setError('Gasto actualizado pero hubo error en la division.')
        setSaving(false)
        submitRef.current = false
        return
      }

      showToast('Gasto actualizado', 'success')
    } else {
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
        submitRef.current = false
        return
      }

      const splitAmount = Math.floor(amountCents / splitBetween.length)
      const remainder = amountCents - splitAmount * splitBetween.length
      const splitsToInsert = splitBetween.map((memberId, idx) => ({
        expense_id: expense.id,
        member_id: memberId,
        amount: splitAmount + (idx < remainder ? 1 : 0),
      }))

      const { error: splitError } = await supabase.from('expense_splits').insert(splitsToInsert)
      if (splitError) {
        setError('Gasto guardado pero hubo error en la division.')
        setSaving(false)
        submitRef.current = false
        return
      }

      showToast('Gasto agregado', 'success')
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
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`relative w-full max-w-md glass border-t border-white/[0.08] rounded-t-3xl max-h-[92dvh] overflow-y-auto transition-transform duration-300 ${isVisible && !isLeaving ? 'translate-y-0' : 'translate-y-full'} ease-[cubic-bezier(0.32,0.72,0,1)]`}
        style={{ background: 'rgba(17, 24, 39, 0.95)', backdropFilter: 'blur(40px)' }}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2" style={{ background: 'rgba(17, 24, 39, 0.95)' }}>
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        <div className="px-5 pb-5">
          <h2 className="text-xl font-bold mb-5">{editingExpense ? 'Editar gasto' : 'Nuevo gasto'}</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Descripcion</label>
              <input
                type="text"
                value={description}
                onChange={(e) => { setDescription(e.target.value); setValidationErrors((v) => ({ ...v, description: '' })) }}
                placeholder="Ej: Cena en la playa"
                maxLength={80}
                className={`w-full py-3 px-4 glass-input rounded-2xl text-text placeholder:text-text-muted focus:outline-none ${validationErrors.description ? 'border-danger!' : ''}`}
              />
              {validationErrors.description && <p className="text-danger text-xs">{validationErrors.description}</p>}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Monto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-semibold">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setValidationErrors((v) => ({ ...v, amount: '' })) }}
                  placeholder="25000"
                  min="1"
                  max="99999999"
                  step="1"
                  className={`w-full py-3 pl-8 pr-4 glass-input rounded-2xl text-text text-lg font-semibold tabular-nums placeholder:text-text-muted placeholder:font-normal focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${validationErrors.amount ? 'border-danger!' : ''}`}
                />
              </div>
              {validationErrors.amount && <p className="text-danger text-xs">{validationErrors.amount}</p>}
            </div>

            {/* Paid by */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Quien pago</label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaidBy(m.id)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all btn-press ${
                      paidBy === m.id
                        ? 'bg-text text-bg ring-1 ring-text'
                        : 'glass text-text-secondary hover:text-text'
                    }`}
                  >
                    {getMemberLabel(m.id)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all btn-press ${
                      category === cat
                        ? 'bg-primary/20 text-primary-light ring-1 ring-primary/30'
                        : 'glass text-text-secondary hover:text-text'
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
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all btn-press ${
                    splitBetween.length === members.length
                      ? 'bg-success text-white ring-1 ring-success glow-success'
                      : 'glass text-text-secondary hover:text-text'
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
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all btn-press ${
                        selected
                          ? 'bg-success/20 text-success ring-1 ring-success/30'
                          : 'glass text-text-muted hover:text-text'
                      }`}
                    >
                      {getMemberLabel(m.id)}
                    </button>
                  )
                })}
              </div>
              {validationErrors.split && <p className="text-danger text-xs">{validationErrors.split}</p>}
              {splitBetween.length > 0 && amount && parseFloat(amount) > 0 && (
                <p className="text-xs text-text-muted mt-1 tabular-nums">
                  ${Math.round(parseFloat(amount) / splitBetween.length).toLocaleString('es-AR')} por persona
                </p>
              )}
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-4 px-4 glass rounded-2xl text-text-secondary font-semibold btn-press hover:text-text transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-[2] flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 px-4 rounded-2xl btn-press glow-primary text-base"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                {saving ? 'Guardando...' : editingExpense ? 'Guardar cambios' : 'Agregar gasto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
