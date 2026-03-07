import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LogIn, MapPin, Calendar, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateGroupCode } from '../lib/utils'

export default function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length === 6) {
      navigate(`/group/${trimmed}`)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || loading) return
    setLoading(true)
    setError('')

    const inviteCode = generateGroupCode()

    const { error: dbError } = await supabase.from('groups').insert({
      name: groupName.trim(),
      destination: destination.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      invite_code: inviteCode,
    })

    if (dbError) {
      setError('Error al crear el grupo. Intentá de nuevo.')
      setLoading(false)
      return
    }

    navigate(`/group/${inviteCode}`)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3 animate-[fadeInUp_0.5s_ease-out_both]">
          <img src="/icon-192.svg" alt="Divvy" className="w-20 h-20 rounded-2xl shadow-lg shadow-primary/30 mx-auto" />
          <h1 className="text-4xl font-black italic bg-gradient-to-r from-primary-light to-secondary bg-clip-text text-transparent">
            Divvy
          </h1>
          <p className="text-text-secondary">
            Dividi los gastos del viaje sin drama
          </p>
        </div>

        {/* Crear grupo */}
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary-hover hover:to-primary text-white font-semibold py-3.5 px-4 rounded-2xl btn-press glow-primary animate-[fadeInUp_0.5s_ease-out_0.1s_both]"
          >
            <Plus size={20} />
            Crear grupo de viaje
          </button>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3 glass rounded-2xl p-4 animate-[fadeInUp_0.3s_ease-out_both]">
            <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wider">Nuevo grupo</h3>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nombre del grupo"
              maxLength={50}
              autoFocus
              className="w-full py-3 px-4 glass-input rounded-2xl text-text placeholder:text-text-muted focus:outline-none"
            />
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destino (ej: Costa, Bariloche...)"
                maxLength={50}
                className="w-full py-3 pl-10 pr-4 glass-input rounded-2xl text-text placeholder:text-text-muted focus:outline-none"
              />
            </div>
            <div className="relative">
              <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Fecha inicio"
                className="w-full py-3 pl-10 pr-4 glass-input rounded-2xl text-text text-sm focus:outline-none"
              />
            </div>
            <div className="relative">
              <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Fecha fin"
                className="w-full py-3 pl-10 pr-4 glass-input rounded-2xl text-text text-sm focus:outline-none"
              />
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 px-4 glass rounded-2xl text-text-secondary hover:text-text transition-colors btn-press"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!groupName.trim() || loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-2xl btn-press glow-primary"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {loading ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </form>
        )}

        {/* Separador */}
        <div className="flex items-center gap-3 animate-[fadeInUp_0.5s_ease-out_0.2s_both]">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-text-muted text-sm">o unite a uno existente</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Unirse con código */}
        <form onSubmit={handleJoin} className="space-y-3 animate-[fadeInUp_0.5s_ease-out_0.3s_both]">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código de 6 caracteres"
            maxLength={6}
            className="w-full text-center text-2xl tracking-[0.3em] font-mono py-3 px-4 glass-input rounded-2xl text-text focus:outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-text-muted"
          />
          <button
            type="submit"
            disabled={code.trim().length !== 6}
            className="w-full flex items-center justify-center gap-2 glass glass-hover disabled:opacity-40 disabled:cursor-not-allowed text-text font-semibold py-3 px-4 rounded-2xl btn-press"
          >
            <LogIn size={20} />
            Unirme al grupo
          </button>
        </form>
      </div>
    </div>
  )
}
