import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Palmtree } from 'lucide-react'

export default function CreateGroup() {
  const navigate = useNavigate()
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || loading) return
    setLoading(true)

    // TODO Fase 2: Crear grupo en Supabase
    // Por ahora solo navega con un código placeholder
    console.log('Crear grupo:', groupName)
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-6">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-text-secondary hover:text-text transition-colors mb-8"
      >
        <ArrowLeft size={20} />
        Volver
      </button>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
              <Palmtree size={24} />
            </div>
            <h2 className="text-2xl font-bold">Nuevo grupo</h2>
            <p className="text-text-secondary text-sm">
              Ponele un nombre al viaje y compartí el código
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ej: Costa 2026, Cariló con amigos..."
              maxLength={50}
              autoFocus
              className="w-full py-3 px-4 border border-border rounded-xl bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!groupName.trim() || loading}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              {loading ? 'Creando...' : 'Crear grupo'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
