import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { UserPlus, Users, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AVATAR_COLORS } from '../lib/utils'
import type { Group, Member } from '../types'

function getMemberKey(groupId: string) {
  return `divvy_member_${groupId}`
}

export default function JoinGroup() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadGroup()
  }, [code])

  async function loadGroup() {
    setLoading(true)
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', code!.toUpperCase())
      .single()

    if (groupError || !groupData) {
      setError('Grupo no encontrado. Verificá el código.')
      setLoading(false)
      return
    }

    setGroup(groupData)

    // Check if already a member
    const savedMemberId = localStorage.getItem(getMemberKey(groupData.id))
    if (savedMemberId) {
      // Verify the member still exists
      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', savedMemberId)
        .single()

      if (memberData) {
        navigate(`/group/${code}/dashboard`, { replace: true })
        return
      } else {
        localStorage.removeItem(getMemberKey(groupData.id))
      }
    }

    // Load existing members
    const { data: membersData } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', groupData.id)
      .order('created_at', { ascending: true })

    setMembers(membersData || [])
    setLoading(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !group || joining) return
    setJoining(true)
    setError('')

    const avatarColor = AVATAR_COLORS[members.length % AVATAR_COLORS.length]

    const { data, error: insertError } = await supabase
      .from('members')
      .insert({
        group_id: group.id,
        name: name.trim(),
        avatar_color: avatarColor,
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        setError('Ya hay alguien con ese nombre en el grupo.')
      } else {
        setError('Error al unirse. Intentá de nuevo.')
      }
      setJoining(false)
      return
    }

    localStorage.setItem(getMemberKey(group.id), data.id)
    navigate(`/group/${code}/dashboard`, { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 gap-4">
        <AlertCircle size={48} className="text-danger" />
        <p className="text-text-secondary text-center">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="text-primary-light hover:text-primary transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  const formatDates = () => {
    if (!group.start_date) return null
    const start = new Date(group.start_date + 'T12:00:00')
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    const s = start.toLocaleDateString('es-AR', opts)
    if (!group.end_date) return s
    const end = new Date(group.end_date + 'T12:00:00')
    const e = end.toLocaleDateString('es-AR', opts)
    return `${s} – ${e}`
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Group info */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black italic bg-gradient-to-r from-primary-light to-secondary bg-clip-text text-transparent">
            {group.name}
          </h1>
          {(group.destination || group.start_date) && (
            <p className="text-text-secondary text-sm">
              {[group.destination, formatDates()].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Members list */}
        {members.length > 0 && (
          <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Users size={16} />
              <span>{members.length} {members.length === 1 ? 'persona' : 'personas'} en el grupo</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-bg-input border border-border"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: m.avatar_color }}
                  />
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Join form */}
        <form onSubmit={handleJoin} className="space-y-3">
          <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
            <label className="text-sm font-medium text-text-secondary">Tu nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="¿Cómo te llaman?"
              maxLength={30}
              autoFocus
              className="w-full py-3 px-4 bg-bg-input border border-border rounded-xl text-text text-lg placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          {error && <p className="text-danger text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={!name.trim() || joining}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-primary/20"
          >
            {joining ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
            {joining ? 'Entrando...' : 'Entrar al grupo'}
          </button>
        </form>
      </div>
    </div>
  )
}

export { getMemberKey }
