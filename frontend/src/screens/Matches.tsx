import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Loading from '../components/Loading'
import { api } from '../api'
import type { Match } from '../types'

export default function Matches() {
  const nav = useNavigate()
  const [matches, setMatches] = useState<Match[] | null>(null)

  useEffect(() => {
    api.matches().then((r) => setMatches(r.matches)).catch(() => setMatches([]))
  }, [])

  if (!matches) return <Loading label="Finding your people…" />

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="text-[22px] font-semibold tracking-tight">Matches</h1>
      <p className="mb-5 text-[13px] text-muted">
        {matches.length === 0
          ? 'Nothing yet.'
          : `${matches.length} ${matches.length === 1 ? 'person' : 'people'} you can start with today`}
      </p>

      {matches.length === 0 ? (
        <div className="rounded-3xl border border-[#EEE] bg-white p-6 text-center shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <p className="text-[15px] font-medium">No links yet</p>
          <p className="mt-1 text-[14px] text-muted">
            Go swipe. The good ones are usually a few cards in.
          </p>
          <button
            type="button"
            onClick={() => nav('/swipe')}
            className="mt-4 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white"
          >
            Back to the stack
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {matches.map((m) => {
            const idea = m.chosen_idea !== null ? m.ideas[m.chosen_idea] : null
            const done = m.mission?.done.filter(Boolean).length ?? 0
            const total = m.mission?.steps.length ?? 0
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => nav(idea ? `/mission/${m.id}` : `/match/${m.id}`)}
                className="flex w-full items-center gap-3 rounded-3xl border border-[#EEE] bg-white p-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
              >
                <Avatar name={m.other.avatar} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="truncate text-[16px] font-semibold leading-tight">
                      {m.other.name}
                    </p>
                    <span className="shrink-0 text-[13px] font-semibold text-accent">
                      {m.score.overall}%
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-muted">
                    {idea
                      ? `${idea.name} · ${done}/${total} done`
                      : 'Pick what you two are building'}
                  </p>
                </div>
                <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-muted" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
