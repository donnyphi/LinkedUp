import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Loading from '../components/Loading'
import { api } from '../api'
import { SEED_NOW, timeAgo } from '../lib/time'
import type { ThreadSummary } from '../types'

export default function Messages() {
  const nav = useNavigate()
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null)

  useEffect(() => {
    api.threads().then((r) => setThreads(r.threads)).catch(() => setThreads([]))
  }, [])

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-line bg-page/95 px-5 py-4 backdrop-blur">
        <h1 className="text-[20px] font-semibold">Messages</h1>
      </header>
      {!threads && <Loading label="Opening messages…" />}
      {threads?.map((t) => {
        const last = t.last
        const preview = t.kind === 'match' && t.project && !last ? `Say hi. You two picked ${t.project}.` : last?.text ?? ''
        const now = t.kind === 'seed' ? SEED_NOW : Date.now() / 1000
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => nav(t.kind === 'match' ? `/mission/${t.id}` : `/thread/${t.id}`)}
            className="flex w-full items-center gap-3 border-b border-line bg-surface px-5 py-4 text-left"
          >
            <Avatar name={t.other.avatar} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[16px] font-semibold">{t.other.name}</p>
                {last && <span className="shrink-0 text-[12px] text-muted">{timeAgo(last.ts, now)}</span>}
              </div>
              <p className="truncate text-[14px] text-muted">
                {t.kind === 'match' && t.project ? (
                  <>
                    <span className="font-medium text-ink/80">{t.project}</span>
                    {t.total > 0 && ` · ${t.done}/${t.total} done`}
                    {last && ` · ${last.text}`}
                  </>
                ) : (
                  preview
                )}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
