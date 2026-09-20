import { ArrowLeft, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Loading from '../components/Loading'
import PostCard from '../components/PostCard'
import SuggestedConnection from '../components/SuggestedConnection'
import { api } from '../api'
import type { MissingPiece, ProjectPage } from '../types'

const STAGE: Record<string, string> = { starting: 'Just started', prototype: 'Prototype', shipped: 'Shipped' }

/** A project: who's on it, what it has, what it still needs, and who could fill that. */
export default function Project() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [pr, setPr] = useState<ProjectPage | null>(null)
  const [piece, setPiece] = useState<MissingPiece | null>(null)
  const [finding, setFinding] = useState(false)

  useEffect(() => {
    setPr(null)
    setPiece(null)
    api.project(id).then(setPr).catch(() => nav('/home'))
  }, [id, nav])

  async function find() {
    if (finding || piece) return
    setFinding(true)
    try {
      setPiece(await api.missingPiece(id))
    } finally {
      setFinding(false)
    }
  }

  if (!pr) return <Loading label="Opening project…" />

  return (
    <div className="min-h-full pb-8">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-page/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => nav(-1)} aria-label="Back" className="text-muted">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <h1 className="text-[17px] font-semibold">Project</h1>
      </header>

      <div className="px-5 pt-5">
        <p className="text-[12px] font-medium text-muted">{STAGE[pr.stage] ?? pr.stage}</p>
        <h2 className="mt-0.5 text-[26px] font-bold leading-tight">{pr.name}</h2>
        <p className="mt-1 text-[16px] leading-relaxed text-ink/85">{pr.one_liner}</p>

        <section className="mt-5">
          <h3 className="mb-2 text-[13px] font-semibold text-muted">Team</h3>
          <div className="flex flex-wrap gap-2">
            {pr.team.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => nav(t.id === 'me' ? '/profile' : `/people/${t.id}`)}
                className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 ring-1 ring-line"
              >
                <Avatar name={t.avatar} size={28} />
                <span className="text-[13px] font-medium">{t.id === 'me' ? 'You' : t.name}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-muted">Has</h3>
            <div className="flex flex-wrap gap-1.5">
              {pr.has.map((s) => (
                <span key={s} className="rounded-full bg-surface px-3 py-1.5 text-[13px] font-medium ring-1 ring-line">
                  {s}
                </span>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-muted">Needs</h3>
            <div className="flex flex-wrap gap-1.5">
              {pr.needs.length === 0 && <span className="text-[13px] text-muted">Nothing yet</span>}
              {pr.needs.map((s) => (
                <span key={s} className="rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-medium text-primary">
                  {s}
                </span>
              ))}
            </div>
          </section>
        </div>

        {pr.needs.length > 0 && !piece && (
          <button
            type="button"
            onClick={find}
            disabled={finding}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white active:bg-primary-pressed disabled:opacity-60"
          >
            <Sparkles size={18} strokeWidth={1.75} />
            {finding ? 'Looking…' : 'Find our missing piece'}
          </button>
        )}
      </div>

      {piece?.candidate && (
        <div className="mt-5 border-t border-line">
          <SuggestedConnection
            label={`Your missing piece · fills ${piece.candidate.covers.join(' and ')}`}
            s={{ profile: piece.candidate.profile, reason: piece.candidate.reason, connected: piece.candidate.connected }}
          />
        </div>
      )}
      {piece && !piece.candidate && (
        <p className="px-5 pt-5 text-[14px] text-muted">Nobody obvious yet. Post what you need and we'll watch for it.</p>
      )}

      <section className="mt-6">
        <h3 className="mb-2 px-5 text-[13px] font-semibold text-muted">Updates</h3>
        {pr.update_posts.length ? (
          pr.update_posts.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
          <p className="px-5 text-[14px] text-muted">No updates yet. The first one is usually "it works, badly."</p>
        )}
      </section>
    </div>
  )
}
