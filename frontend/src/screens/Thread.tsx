import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Loading from '../components/Loading'
import { api } from '../api'
import type { SeedThread } from '../types'

/** A seeded, read-only thread. Texture for the Messages tab; nothing here is live. */
export default function Thread() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [t, setT] = useState<SeedThread | null>(null)

  useEffect(() => {
    api.thread(id).then(setT).catch(() => nav('/messages'))
  }, [id, nav])

  if (!t) return <Loading label="Opening…" />

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <button type="button" onClick={() => nav('/messages')} aria-label="Back" className="text-muted">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <button type="button" onClick={() => nav(`/people/${t.other.id}`)} className="flex items-center gap-3 text-left">
          <Avatar name={t.other.avatar} size={36} />
          <div>
            <p className="text-[15px] font-semibold leading-tight">{t.other.name}</p>
            <p className="text-[12px] text-muted">{t.other.school}</p>
          </div>
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {t.chat.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <span
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${
                m.from === 'me' ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-surface shadow-card'
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <p className="shrink-0 border-t border-line bg-surface px-4 py-3 text-center text-[12px] text-muted">
        Demo thread. Connect with {t.other.name.split(' ')[0]} to start a real one.
      </p>
    </div>
  )
}
