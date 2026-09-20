import { Layers } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Loading from '../components/Loading'
import { api } from '../api'
import type { PersonRow } from '../types'

function whyLine(r: PersonRow) {
  const they = r.fills.length ? `They bring ${r.fills.slice(0, 2).join(' and ')}.` : ''
  const you = r.you_bring.length ? `You bring ${r.you_bring.slice(0, 2).join(' and ')}.` : ''
  return [they, you].filter(Boolean).join(' ') || 'Building for the same people you are.'
}

function PersonCard({ r }: { r: PersonRow }) {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  async function connect() {
    setBusy(true)
    try {
      const { match } = await api.connect(r.profile.id)
      nav(`/match/${match.id}`)
    } catch {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col rounded-card border border-line bg-surface p-4">
      <button type="button" onClick={() => nav(`/people/${r.profile.id}`)} className="flex items-center gap-3 text-left">
        <Avatar name={r.profile.avatar} size={48} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight">{r.profile.name}</p>
          <p className="truncate text-[12px] text-muted">{r.profile.school}</p>
        </div>
      </button>
      <p className="mt-3 line-clamp-2 text-[14px] leading-snug">{r.profile.builder_title}</p>
      <p className="mt-2 text-[12px] font-semibold text-primary">
        {r.fit_label} <span className="font-normal text-muted">· fit {r.score.overall}</span>
      </p>
      <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{whyLine(r)}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => nav(`/people/${r.profile.id}`)}
          className="flex-1 rounded-full border border-line px-3 py-2 text-[13px] font-semibold"
        >
          View profile
        </button>
        <button
          type="button"
          onClick={r.connected ? () => nav(`/people/${r.profile.id}`) : connect}
          disabled={busy}
          className="flex-1 rounded-full bg-primary px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {r.connected ? 'Connected' : busy ? '…' : 'Connect'}
        </button>
      </div>
    </div>
  )
}

export default function Discover() {
  const nav = useNavigate()
  const [people, setPeople] = useState<PersonRow[] | null>(null)

  useEffect(() => {
    api.people().then((r) => setPeople(r.people)).catch(() => setPeople([]))
  }, [])

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 flex items-end justify-between border-b border-line bg-page/95 px-5 py-4 backdrop-blur">
        <div>
          <h1 className="text-[20px] font-semibold">Discover</h1>
          <p className="text-[13px] text-muted">Builders who complement your stack</p>
        </div>
        <button
          type="button"
          onClick={() => nav('/swipe')}
          className="flex items-center gap-1.5 text-[13px] font-medium text-muted"
        >
          <Layers size={16} strokeWidth={1.75} />
          Quick discover
        </button>
      </header>
      {!people && <Loading label="Finding people…" />}
      {people && (
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {people.map((r) => (
            <PersonCard key={r.profile.id} r={r} />
          ))}
        </div>
      )}
    </div>
  )
}
